const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.disable("x-powered-by");

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "durrat_baghdad.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    aiConnected: !!GEMINI_API_KEY,
    provider: "Google Gemini",
    model: GEMINI_MODEL,
    uptime: Math.floor(process.uptime())
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        status: "error",
        reply: "اكتب رسالة أولاً."
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        status: "error",
        reply: "GEMINI_API_KEY غير موجود في Railway Variables."
      });
    }

    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-20)) {
        if (
          item &&
          (item.role === "user" || item.role === "model") &&
          typeof item.text === "string" &&
          item.text.trim()
        ) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text.trim() }]
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message.trim() }]
    });

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            {
              text:
                "أنت مساعد الذكاء الاصطناعي لمنصة دُرّة بغداد 🇮🇶. " +
                "أجب بالعربية بشكل طبيعي وودود وذكي ودقيق. " +
                "استخدم اللهجة العراقية عندما تكون مناسبة."
            }
          ]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[GEMINI ERROR]", JSON.stringify(data, null, 2));

      return res.status(response.status).json({
        status: "error",
        reply:
          data?.error?.message ||
          "Gemini رفض الطلب. تحقق من مفتاح API وإعدادات المشروع."
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(500).json({
        status: "error",
        reply: "وصل رد من Gemini لكن بدون نص."
      });
    }

    res.json({
      status: "success",
      reply,
      model: GEMINI_MODEL
    });

  } catch (error) {
    console.error("[SERVER ERROR]", error);

    res.status(500).json({
      status: "error",
      reply: "حدث خطأ داخلي أثناء الاتصال بالذكاء الاصطناعي."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🇮🇶 دُرّة بغداد");
  console.log(`🚀 PORT: ${PORT}`);
  console.log(`🤖 Gemini: ${GEMINI_API_KEY ? "CONNECTED" : "NOT CONFIGURED"}`);
  console.log(`🧠 Model: ${GEMINI_MODEL}`);
});
