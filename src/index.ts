import express from 'express';
import sql from 'mssql';
import axios from 'axios';
import dotenv from 'dotenv';
import * as BP from 'body-parser';

const app = express();
const port = process.env.PORT || '6543';

dotenv.config();
app.use(BP.json({ limit: '5mb' }));

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
        trustServerCertificate: true,
    },
};

let sqlPool: any; // Declare a variable to hold the connection pool

async function initSqlPool() {
    if (!sqlPool) {
        sqlPool = await sql.connect(sqlConfig);
    }
}

async function fetchImageAndCreateBuffer(link: string) {
    try {
        const response = await axios.get(link, {
            responseType: 'arraybuffer',
        });
        const imageBuffer = Buffer.from(response.data, 'binary');
        return imageBuffer;
    } catch (err) {
        console.error({ err });
    }
}

app.get('/send-email', async (req, res) => {
    try {
        await initSqlPool();
        const { userKey, userID, email, from, subject, message, richmessage, account, cc, bcc, attachement } = req.body;
        //Stored procedure for EmailQueue
        const emailQueue = `exec QueueEmail @uk,@uid,@address,@from,@subject,@message,@richmessage,@account,@cc,@bcc`;

        const request = new sql.Request(sqlPool);
        request.input('uk', userKey);
        request.input('uid', userID);
        request.input('from', from);
        request.input('subject', subject);
        request.input('message', message);
        request.input('richmessage', richmessage);
        request.input('account', account);
        request.input('cc', cc);
        request.input('bcc', bcc);
        request.input('address', email);

        const { recordset: [{ Key: mkey }] } = await request.query(emailQueue);

        if (attachement) {
            //Stored procedure for EmailAttachments
            const attachementProcedure = `exec AddEmailAttachment @mkey,@name,@data`;
            const attachmentRequest = new sql.Request(sqlPool);

            attachmentRequest.input('mkey', mkey);
            attachmentRequest.input('name', attachement.name);
            attachmentRequest.input('data', await fetchImageAndCreateBuffer(attachement.data));

            await attachmentRequest.query(attachementProcedure);
        }

        res.status(200).send({ msg: "Data inserted in queue successfully!!" });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send({ error });
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
})

