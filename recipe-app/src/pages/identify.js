import * as React from 'react';
import { useDropzone } from "react-dropzone";

const API_KEY = "AIzaSyAhjNVx1ebYkFH0ipLVXXnv6SlekC76QHg";


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.readAsDataURL(file);
  });
}

async function detectWithFetch(file) {
  const base64 = await fileToBase64(file);
  const mime = file.type || "image/jpeg";

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { data: base64, mime_type: mime } },
          {
            text:
              "Identify what food this is and return only the food name, be as specific as possible. For example include any sauces or specific ingredients that you can clearly identify. " +
              "If unsure, reply exactly: Upload the photo from a different angle and try again."
          }
        ]
      }
    ]
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || "Gemini request failed");

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "";

  return text || "No result";
}

export default function Identify() {
  const [status, setStatus] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState("");

  const onDrop = React.useCallback(async (accepted) => {
    if (!accepted?.length) return;
    const file = accepted[0];
    setPreviewUrl(URL.createObjectURL(file));
    setStatus("Analyzing…");
    try {
      const result = await detectWithFetch(file);
      setStatus(result);
    } catch (e) {
      console.error(e);
      setStatus("Failed to analyze image.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      multiple: false,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"]
      }
    });

  return (
    <section className="container" style={{ maxWidth: 680, margin: "24px auto" }}>
      <div
        {...getRootProps({ className: "dropzone" })}
        style={{
          border: "2px dashed #999",
          padding: 24,
          borderRadius: 12,
          textAlign: "center",
          cursor: "pointer"
        }}
      >
        <input {...getInputProps()} />
        <p>{isDragActive ? "Drop it here…" : "Drag & drop or click to select an image"}</p>
        <em>(*.jpeg or *.png)</em>
      </div>

      <aside style={{ marginTop: 16 }}>
        {acceptedFiles.length > 0 && (
          <ul>
            <li>
              {acceptedFiles[0].name} — {acceptedFiles[0].size} bytes
            </li>
          </ul>
        )}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="preview"
            style={{ maxWidth: 260, borderRadius: 8, marginTop: 8 }}
          />
        )}
        {status && (
          <p style={{ marginTop: 12 }}>
            <strong>Result:</strong> {status}
          </p>
        )}
      </aside>
    </section>
  );
}


