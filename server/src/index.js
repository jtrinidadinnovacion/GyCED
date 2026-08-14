require('dotenv').config();
const express = require('express');
const cors = require('cors');
const examenesRouter = require('./routes/examenes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/examenes', examenesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
