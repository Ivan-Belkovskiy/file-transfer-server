const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const app = express();
const path = require('path');
const pool = require('./config/db');

const FILES_TABLENAME = `filetransferapp__files`;

const upload = multer({ dest: 'tmp/' });

// const decodeFilename = (encoded) => decodeURI(atob(encoded));

const dropTable = async (tableName) => {
    try {
        const result = await pool.query(
            `DROP TABLE ${tableName}`
        );
    } catch (error) {
        console.error('Ошибка удаления таблицы: ', error);
    }
}

const initFilesTable = async () => {
    try {
        const result = await pool.query(`CREATE TABLE IF NOT EXISTS ${FILES_TABLENAME} (
                id SERIAL PRIMARY KEY,
                filename TEXT UNIQUE NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);
    } catch (error) {
        console.error('Ошибка создания таблицы: ', error);
        throw error;
    }
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send("<h1>File-Transfer-Server is working!</h1>"));

app.get('/api/files', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${FILES_TABLENAME}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения файлов!');
        res.status(500).json({ message: 'Ошибка загрузки файлов' });
    }
});

app.post('/api/files', upload.single('file'), async (req, res) => {
    try {
        const tempPath = req.file.path;
        const textFilename = (req.file.originalname);
        console.log(req.file);
        const targetPath = path.join(__dirname, 'uploads', textFilename);

        fs.renameSync(tempPath, targetPath);

        const result = await pool.query(
            `INSERT INTO ${FILES_TABLENAME} (filename) VALUES ($1) RETURNING *`,
            [textFilename]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Uploading Error!!!');
        res.status(500).json({ message: 'Internal Server Error' });
        throw error;
    }
});

app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Файл не найден' });
    }

    // const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${(filename)}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});


app.listen(3704, async () => {
    await dropTable(FILES_TABLENAME);
    await initFilesTable();
    console.log('File Transfer Server is running on 3704 (#inv_robots) PORT!')
});