const bcrypt = require('bcrypt');
const email = "admin@gmail.com";
const password = "admin";
const saltRounds = 10;

// Import admin model for database connection
const adminModel = require('./db/admin');

async function insert() {
    try {
        let result = await adminModel.findOne({email : email})

        if(!result){

            let hashedPassword = await bcrypt.hash(password, saltRounds);
            console.log("Hashed Password:", hashedPassword);

            let admin = await adminModel.create({
                email: email,
                password: hashedPassword // Corrected key name
            });
            console.log("Admin:", admin);
            console.log('ADMIN ADDED');

        }  else{
            console.log('admin Already Existed')
        }  
    } catch (error) {
        console.error("Error occurred while creating admin:", error);
    }
}

async function delete_(){
    try {
        let result = await adminModel.findOne({email : email})
        if(result){
            let admin = await adminModel.findOneAndDelete({email : email})
            console.log('Deleted Admin '+admin)
            console.log('ADMIN DELETED');
        }else{
            console.log('Admin Not Found')
        }
    } catch (error) {
        console.error("Error occurred while creating admin:", error);
    }
}

async function update_() {
    try {
        let hashedPassword = await bcrypt.hash(password, saltRounds);

        let admin = await adminModel.findOneAndUpdate(
            { email: email },
            {
                email: email,
                password: hashedPassword
            },
            { new: true } // This option returns the updated document
        );

        if (admin) {
            console.log("Admin:", admin);
            console.log('ADMIN UPDATED');
        } else {
            console.log('Admin not found');
        }
    } catch (error) {
        console.error("Error occurred while updating admin:", error);
    }
}

update_();
// insert()