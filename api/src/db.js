require("dotenv").config();
const mongoose = require('mongoose');
const log = require('./logger');

async function connectMongo(){
    const url = process.env.MONGO_URL ;
    if(!url){
        throw new Error('MONGO_URL is not set');
    }else{
        await mongoose.connect(url, {dbName: 'droplater'});
        log.info({url},'MongoDB connected');
    }
    
}
module.exports={connectMongo};