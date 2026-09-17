const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    console.error("EMAIL_USER veya EMAIL_APP_PASSWORD eksik.");
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_APP_PASSWORD
    }
});

const verificationCodes = new Map();

function generateCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/", (req, res) => {
    res.json({
        success: true,
        name: "DISCORD BOT",
        status: "online"
    });
});

app.post("/api/send-code", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "E-posta adresi boş bırakılamaz."
            });
        }

        if (!validEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Geçerli bir e-posta adresi yaz."
            });
        }

        const code = generateCode();

        verificationCodes.set(email, {
            code,
            expires: Date.now() + 10 * 60 * 1000
        });

        await transporter.sendMail({
            from: `"DISCORD BOT" <${EMAIL_USER}>`,
            to: email,
            subject: "DISCORD BOT - E-posta Doğrulama",
            text:
                `DISCORD BOT hesabını doğrulamak için doğrulama kodun: ${code}\n\n` +
                `Bu kod 10 dakika boyunca geçerlidir.`
        });

        res.json({
            success: true,
            message: "Doğrulama kodu gönderildi."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "E-posta gönderilemedi."
        });
    }
});

app.post("/api/verify-code", (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

    const code = String(req.body.code || "").trim();

    const saved = verificationCodes.get(email);

    if (!saved) {
        return res.status(400).json({
            success: false,
            message: "Doğrulama kodu bulunamadı."
        });
    }

    if (Date.now() > saved.expires) {
        verificationCodes.delete(email);

        return res.status(400).json({
            success: false,
            message: "Doğrulama kodunun süresi doldu."
        });
    }

    if (saved.code !== code) {
        return res.status(400).json({
            success: false,
            message: "Doğrulama kodu yanlış."
        });
    }

    verificationCodes.delete(email);

    res.json({
        success: true,
        message: "E-posta doğrulandı."
    });
});

app.listen(PORT, () => {
    console.log(`DISCORD BOT backend ${PORT} portunda çalışıyor.`);
});
