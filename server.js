const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// تم وضع المفتاح الخاص بك بنجاح
const ai = new GoogleGenAI({ apiKey: process.env.GEMIIN_APK_KEY || process.env.API_KEY || 'AQ.Ab8RN6I-u489eJw0fjbs5quXqfQyZbOIsptduRAollJ9KGzS5g'});

app.disable('x-powered-by');
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(__dirname));

// الصفحة الرئيسية (واجهة دُرّة بغداد)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'durrat_baghdad.html')); // أو index.html حسب اسم ملفك
});

// فحص حالة السيرفر
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Durrat Baghdad AI Connected',
        name: 'دُرّة بغداد',
        country: 'Iraq',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// استقبال رسائل الدردشة وربطها بالذكاء الاصطناعي الحقيقي
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                status: 'error',
                reply: 'يرجى كتابة رسالة أولاً.'
            });
        }

        // إرسال رسالة المستخدم إلى نموذج الذكاء الاصطناعي واستلام الرد
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: "أنت مساعد ذكي لمنصة 'دُرّة بغداد' العراقية. تتحدث بأسلوب بشري، طبيعي، ودود، وذكي جداً، وتجيب بدقة عالية باللغة العربية.",
            }
        });

        const reply = response.text || "عذراً، لم أستطع توليد رد في الوقت الحالي.";

        // إرجاع الرد الحقيقي إلى واجهة موقعك
        res.json({
            status: 'success',
            reply,
            server: 'Durrat Baghdad AI'
        });

    } catch (error) {
        console.error('[AI CHAT ERROR]', error);
        res.status(500).json({
            status: 'error',
            reply: 'حدث خطأ في الاتصال بالذكاء الاصطناعي. تحقق من الاتصال والمفتاح.'
        });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log('');
    console.log('🇮🇶 =======================================');
    console.log('      دُرّة بغداد | Baghdad Pearl (Connected)');
    console.log('🇮🇶 =======================================');
    console.log(`🚀 الموقع : http://localhost:${PORT}`);
    console.log('✅ تم ربط المنصة بالذكاء الاصطناعي بنجاح');
    console.log('');
});