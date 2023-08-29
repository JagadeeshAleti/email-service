import express from 'express';
import axios from 'axios';
import nodemailer from 'nodemailer';
import * as BP from 'body-parser';
import dotenv from 'dotenv';

const app = express();
const port = process.env.PORT || '6543';

dotenv.config();
app.use(BP.json());

// Define your SMTP transport configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD
    }
})

app.get('/send-email', async (req, res) => {
    try {
        const { emails, subject, text, imageLink } = req.body as any;
        if (!emails || !text || !subject) {
            return res.status(400).send('Recipents, subject and text are required.');
        }

        let config: any = {
            to: emails, //Array of user emails
            subject: subject,
            text: text,
        }

        if (!!imageLink) {
            const response = await axios.get(imageLink, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');

            config.attachments = [
                {
                    filename: `image.jpg`,
                    content: imageBuffer,
                },
            ]
        }

        // Send email
        await transporter.sendMail(config);

        res.send('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:');
        res.status(500).send('An error occurred while sending the email.');
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
})

