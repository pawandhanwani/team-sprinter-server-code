const mongoose = require('mongoose');
const validator = require('validator');

const Task = mongoose.model("Task" , {
    sprintID : {
       type : Object,
       trim : true,
       ref : 'sprints'
    },
    description : {
        type : String,
        trim : true
    },
    status : {
        type : String,
        trim : true,
        validate (value) {
            const possibleStatuses = ["Pending","In Progress","Completed"];
            if(!possibleStatuses.includes(value))
            {
                throw new Error("invalid task status");
            }
        } 
    }
})

module.exports = Task;