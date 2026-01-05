const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json()); // For future API endpoints

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Personal Food Map Tracker running on http://localhost:${PORT}`));