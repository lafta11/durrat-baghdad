const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// Railway يعطي PORT تلقائياً
const PORT = process.env.PORT || 3000;

// اسم ملف الواجهة
const FRONTEND_FILE = process.env.FRONTEND_FILE || 'durrat_baghdad.html';

// مفتاح Gemini يجب أن يكون داخل Railway Variables
// لا تضع المفتاح الحقيقي داخل هذا الملف.
const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    : null;

app.disable('x-powered-by');

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ملفات الواجهة والصور وملفات JavaScript/CSS
app.use(express.static(__dirname));

// ===============================
// الصفحة الرئيسية
// ===============================
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, FRONTEND_FILE);

    res.sendFile(filePath, (error) => {
        if (error) {
            console.error('[FRONTEND ERROR]', error);

            res.status(500).send(
                `تعذر فتح واجهة دُرّة بغداد. تأكد أن الملف "${FRONTEND_FILE}" موجود داخل المشروع.`
            );
        }
    });
});

// ===============================
// فحص السيرفر والذكاء الاصطناعي
// ===============================
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        aiConnected: Boolean(ai),
        aiProvider: 'Google Gemini',
        model: GEMINI_MODEL,
        service: 'Durrat Baghdad AI',
        name: 'دُرّة بغداد',
        country: 'Iraq',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// ===============================
// دردشة Gemini الحقيقية
// ===============================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                status: 'error',
                reply: 'يرجى كتابة رسالة أولاً.'
            });
        }

        if (!ai) {
            return res.status(500).json({
                status: 'error',
                reply:
                    'Gemini غير متصل بالسيرفر. افتح Railway → Variables وأضف GEMINI_API_KEY ثم أعد النشر.'
            });
        }

        // نبني سياق المحادثة عند توفره
        const safeHistory = Array.isArray(history)
            ? history
                .filter(item =>
                    item &&
                    (item.role === 'user' || item.role === 'model') &&
                    typeof item.text === 'string' &&
                    item.text.trim()
                )
                .slice(-20)
            : [];

        const contents = [
            ...safeHistory.map(item => ({
                role: item.role,
                parts: [{ text: item.text.trim() }]
            })),
            {
                role: 'user',
                parts: [{ text: message.trim() }]
            }
        ];

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                systemInstruction:
                    'أنت مساعد الذكاء الاصطناعي لمنصة دُرّة بغداد 🇮🇶. أجب باللغة العربية بطريقة طبيعية وذكية وودودة. استخدم اللهجة العراقية عندما تكون مناسبة للسياق. كن دقيقاً، ولا تدّعِ تنفيذ أي إجراء لم تنفذه فعلاً.'
            }
        });

        const reply =
            typeof response.text === 'string' && response.text.trim()
                ? response.text.trim()
                : 'عذراً، لم أستطع توليد رد في الوقت الحالي.';

        return res.json({
            status: 'success',
            reply,
            server: 'Durrat Baghdad AI',
            model: GEMINI_MODEL
        });

    } catch (error) {
        console.error('[AI CHAT ERROR]', error);

        const errorText = String(error?.message || error);

        let reply =
            'حدث خطأ أثناء الاتصال بذكاء Gemini. تحقق من إعدادات Railway ثم جرّب مرة أخرى.';

        if (/api key|api_key|unauth|unauthorized|permission|401|403/i.test(errorText)) {
            reply =
                'مفتاح Gemini غير صحيح أو غير مفعّل. تحقق من قيمة GEMINI_API_KEY في Railway Variables.';
        } else if (/quota|rate.?limit|429/i.test(errorText)) {
            reply =
                'تم الوصول إلى حد الطلبات في Gemini حالياً. حاول بعد قليل.';
        } else if (/model|not found|404/i.test(errorText)) {
            reply =
                `النموذج ${GEMINI_MODEL} غير متاح لهذا المفتاح. غيّر GEMINI_MODEL من Railway Variables إلى نموذج متاح.`;
        }

        return res.status(500).json({
            status: 'error',
            reply
        });
    }
});

// ===============================
// معالجة أخطاء JSON
// ===============================
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({
            status: 'error',
            reply: 'بيانات الطلب غير صحيحة.'
        });
    }

    next(error);
});

// ===============================
// 404
// ===============================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            status: 'error',
            message: 'مسار API غير موجود.'
        });
    }

    res.status(404).send('الصفحة غير موجودة.');
});

// ===============================
// تشغيل السيرفر
// ===============================
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🇮🇶 =======================================');
    console.log('      دُرّة بغداد | Baghdad Pearl');
    console.log('🇮🇶 =======================================');
    console.log(`🚀 PORT: ${PORT}`);
    console.log(`🌐 Frontend: ${FRONTEND_FILE}`);
    console.log(`🤖 Gemini: ${ai ? 'CONNECTED' : 'NOT CONFIGURED'}`);
    console.log(`🧠 Model: ${GEMINI_MODEL}`);
    console.log('✅ السيرفر جاهز');
    console.log('');
});
