const peno= required('peno');
module.exports=pino({level:process.env.LOG_LEVEL || 'info'});