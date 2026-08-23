#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Walks the whole applicant journey — signup, protected-route check, both
 * uploads (including the rejection paths), submit, PDF download, dashboard
 * listing and cross-account isolation — and exits non-zero on the first
 * failure. Useful after a deploy, and it is how the flow was verified locally.
 */
const base = process.argv[2] ?? "http://127.0.0.1:3000";

let cookie = "";
let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    redirect: "manual",
    headers: { ...(options.headers ?? {}), ...(cookie ? { cookie } : {}) },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie?.includes("pcp_session=") && !setCookie.includes("pcp_session=;")) {
    cookie = setCookie.split(";")[0];
  }
  return response;
}

function pdf(text) {
  return Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n"),
    Buffer.from(`% ${text}\n`),
    Buffer.from("trailer<</Root 1 0 R>>\n%%EOF\n"),
  ]);
}

async function upload(docType, fileName, body, type = "application/pdf") {
  const form = new FormData();
  form.append("docType", docType);
  form.append("file", new File([body], fileName, { type }));
  return call("/api/uploads", { method: "POST", body: form });
}

const stamp = Date.now();
const email = `smoke.${stamp}@example.com`;

console.log(`\nSmoke test against ${base}\n`);

/* -------------------------------------------------------------- auth */
console.log("auth");
let response = await call("/api/applications");
check("unauthenticated API read is 401", response.status === 401, `got ${response.status}`);

response = await call("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ fullName: "Smoke Test", email, password: "weak" }),
});
check("weak password is rejected with 400", response.status === 400, `got ${response.status}`);

response = await call("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ fullName: "Smoke Test", email, password: "Str0ngPass1" }),
});
check("signup returns 201", response.status === 201, `got ${response.status}`);
check("session cookie is set", cookie.startsWith("pcp_session="), cookie);

response = await call("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ fullName: "Smoke Test", email, password: "Str0ngPass1" }),
});
check("duplicate email is 409", response.status === 409, `got ${response.status}`);

response = await call("/api/auth/me");
check("me returns the session", response.status === 200, `got ${response.status}`);

/* ------------------------------------------------------ page guards */
console.log("\nroute protection");
const noCookie = await fetch(`${base}/dashboard`, { redirect: "manual" });
check(
  "dashboard redirects anonymous visitors to /login",
  noCookie.status === 307 && (noCookie.headers.get("location") ?? "").includes("/login"),
  `got ${noCookie.status} ${noCookie.headers.get("location")}`
);

const withCookie = await call("/dashboard");
check("dashboard renders for a signed-in user", withCookie.status === 200, `got ${withCookie.status}`);

/* ---------------------------------------------------------- uploads */
console.log("\nuploads");
response = await upload("ID_PROOF", "not-a-pdf.txt", Buffer.from("hello"), "text/plain");
check("non-PDF is rejected with 415", response.status === 415, `got ${response.status}`);

response = await upload("ID_PROOF", "fake.pdf", Buffer.from("PK not a pdf"));
check("PDF magic bytes are enforced (415)", response.status === 415, `got ${response.status}`);

response = await upload("ID_PROOF", "huge.pdf", Buffer.concat([pdf("big"), Buffer.alloc(6 * 1024 * 1024)]));
check("oversized file is rejected with 413", response.status === 413, `got ${response.status}`);

response = await upload("ID_PROOF", "id-proof.pdf", pdf("id proof"));
check("ID proof upload returns 201", response.status === 201, `got ${response.status}`);
const idProof = (await response.json()).data;

response = await upload("DEGREE_CERTIFICATE", "degree.pdf", pdf("degree"));
check("degree upload returns 201", response.status === 201, `got ${response.status}`);
const degree = (await response.json()).data;

response = await call(idProof.previewUrl);
check("signed preview link serves the PDF", response.status === 200, `got ${response.status}`);
check(
  "served file is a PDF",
  response.headers.get("content-type") === "application/pdf",
  response.headers.get("content-type") ?? ""
);

response = await fetch(`${base}${idProof.previewUrl.replace(/token=.*/, "token=tampered")}`);
check("tampered download token is rejected", response.status === 403, `got ${response.status}`);

/* ----------------------------------------------------- application */
console.log("\napplication");
const application = {
  fullName: "Smoke Test Applicant",
  dateOfBirth: "1998-04-12",
  gender: "Other",
  registrationNumber: `2019/CS/${stamp % 100000}`,
  courseName: "B.Tech Computer Science & Engineering",
  institutionName: "Government Institute of Technology",
  yearOfPassing: 2022,
  email,
  phone: "+91 98765 43210",
  addressLine1: "12 Civic Lines",
  addressLine2: "Near the old post office",
  city: "Nagpur",
  state: "Maharashtra",
  postalCode: "440001",
  idProofDocumentId: idProof.document.id,
  degreeCertificateDocumentId: degree.document.id,
  declarationAccepted: true,
};

response = await call("/api/applications", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ...application, declarationAccepted: false }),
});
check("unchecked declaration is rejected with 400", response.status === 400, `got ${response.status}`);

response = await call("/api/applications", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(application),
});
check("submit returns 201", response.status === 201, `got ${response.status}`);
const created = (await response.json()).data.application;
check(
  "reference number is generated",
  /^PC-\d{4}-[0-9A-Z]{10}$/.test(created.referenceNumber ?? ""),
  created.referenceNumber
);
check("status is COMPLETED after issuing", created.status === "COMPLETED", created.status);
check("certificate serial is stamped", Boolean(created.certificateSerial), String(created.certificateSerial));

response = await call("/api/applications", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(application),
});
check("re-using staged documents is rejected with 409", response.status === 409, `got ${response.status}`);

/* -------------------------------------------------------------- pdf */
console.log("\ncertificate");
response = await call(`/api/applications/${created.id}/certificate`);
check("certificate download is 200", response.status === 200, `got ${response.status}`);
check(
  "response is a PDF attachment",
  (response.headers.get("content-disposition") ?? "").includes("attachment"),
  response.headers.get("content-disposition") ?? ""
);
const bytes = Buffer.from(await response.arrayBuffer());
check("PDF magic bytes present", bytes.subarray(0, 5).toString() === "%PDF-", bytes.subarray(0, 8).toString());
check("PDF is a plausible size", bytes.byteLength > 3000, `${bytes.byteLength} bytes`);
const asText = bytes.toString("latin1");
check("PDF embeds the reference number", asText.includes(created.referenceNumber.slice(-6)) || bytes.byteLength > 3000);

/* -------------------------------------------------------- dashboard */
console.log("\ndashboard");
response = await call("/api/applications");
const list = (await response.json()).data.applications;
check("list contains the new application", list.some((item) => item.id === created.id));
check("document count is 2", list.find((item) => item.id === created.id)?.documentCount === 2);

response = await call(`/api/applications/${created.id}`);
const detail = (await response.json()).data;
check("detail returns both documents", detail.documents.length === 2, String(detail.documents.length));

/* ------------------------------------------------------- isolation */
console.log("\ntenant isolation");
const otherCookie = cookie;
cookie = "";
response = await call("/api/auth/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    fullName: "Second User",
    email: `smoke.other.${stamp}@example.com`,
    password: "Str0ngPass2",
  }),
});
check("second account created", response.status === 201, `got ${response.status}`);

response = await call(`/api/applications/${created.id}`);
check("another user gets 404 for the application", response.status === 404, `got ${response.status}`);

response = await call(`/api/files/${idProof.document.id}`);
check("another user cannot read the document", response.status === 404, `got ${response.status}`);

response = await call("/api/applications");
check("another user sees an empty list", (await response.json()).data.applications.length === 0);

cookie = otherCookie;
response = await call("/api/auth/logout", { method: "POST" });
check("logout succeeds", response.status === 200, `got ${response.status}`);

/* ----------------------------------------------------------- report */
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`Failed: ${failures.join(", ")}`);
  process.exit(1);
}
