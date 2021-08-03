const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/team-sprinter',{
    useNewUrlParser : true,
    useCreateIndex : true
})
