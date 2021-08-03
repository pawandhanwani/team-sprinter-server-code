const mongoose = require('mongoose');
const validator = require('validator');

const Permission = mongoose.model('Permission',{
    sprintID : {
        type : Object,
        trim : true,
        ref : 'sprints'
    },
    userID : {
        type : Object,
        trim : true,
        ref : 'users'
    },
    role : {
        type : String,
        trim : true,
        validate (value) {
            const roles = ["Creator","Admin","Member"]
            if(value){
                if(!roles.includes(value))
                {
                    throw new Error("Invalid Role")
                }
            }
        }
    }
})

module.exports = Permission;