const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")
.then(res => {
    console.log("Database Connection sucessful for admins")
}).catch(err => {
    console.log("no connection")
})

const adminSchema = mongoose.Schema({
   email : String, 
   password : String
})

module.exports = mongoose.model('admins', adminSchema)