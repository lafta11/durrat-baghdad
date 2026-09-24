const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_FILE = process.env.FRONTEND_FILE || 'durrat_baghdad.html';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let ai = null;
try {
    if (GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
} catch (e) {
    console.error('AI Init Error:', e);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, FRONTEND_FILE), (error) => {
        if (error) {
            res.status(500).send(`تعذر فتح واجهة دُرّة بغداد. تأكد أن الملف "${FRONTEND_FILE}" موجود.`);
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        aiConnected: Boolean(ai),
        model: GEMINI_MODEL,
        service: 'Durrat Baghdad AI',
        uptime: Math.floor(process.uptime())
    });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ status: 'error', reply: 'يرجى كتابة رسالة صحيحة.' });
        }

        if (!ai) {
            return res.status(500).json({ status: 'error', reply: 'مفتاح Gemini غير متصل في متغيرات Railway.' });
        }

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: message.trim(),
            config: {
                systemInstruction: 'أنت مساعد الذكاء الاصطناعي لمنصة دُرّة بغداد 🇮🇶. أجب باللغة العربية بطريقة ذكية وودودة.'
            }
        });

        const reply = response.text ? response.text.trim() : 'عذراً، لم أستطع توليد رد.';
        return res.json({ status: 'success', reply });

    } catch (error) {
        console.error('[AI ERROR]', error);
        return res.status(500).json({ status: 'error', reply: 'حدث خطأ في الاتصال بـ Gemini.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل بشكل مستقر على البورت: ${PORT}`);
});