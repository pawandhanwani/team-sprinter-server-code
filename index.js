const express = require('express');
const mongoose = require('mongoose');
require('./src/db/mongoose');
const app = express()
const port = process.env.PORT || 5011;
const md5 = require('md5'); 
const bodyParser = require('body-parser');
const moment = require("moment");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


const User = require('./src/models/user');
const Sprint = require('./src/models/sprint');
const Permission = require('./src/models/permission');
const Task = require('./src/models/task');
const Log = require('./src/models/log');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post('/users' ,async(req,res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = md5(req.body.password);
    const user = new User({name : name , email : email , password : password})

    try{
        const userExists = await User.count({email : email}) > 0
        if(userExists)
        {
            res.status(400).send();
            return;
        }
        await user.save()
            .then(response => {
                console.log(response);
                res.status(201).send(response._id);
            })
            .catch(error => {
                console.log(error);
                res.status(500).send()
            })
    }
    catch (error){
        res.status(500).send();
    }
})

app.post('/login', async(req,res) => {
    const email = req.body.email;
    const password = md5(req.body.password);
    try {
        const user = await User.findOne({email : email , password : password})
        if(!user)
        {
            res.status(404).send()
        }
        res.status(200).send(user._id);
    }
    catch (error) {
        res.status(500).send();
    }

})

app.post('/sprints', async(req,res) => {
    const sprint = new Sprint({name : req.body.name , closed : false})
    sprint.save()
        .then(response => {
            console.log(response);
            const permission = new Permission({sprintID : response._id, userID : mongoose.Types.ObjectId(req.body.id) , role : "Creator" })
            permission.save()
                .then(response => {
                    res.status(201).send("Sprint created succesfully");
                })
                .catch(error => {
                    res.status(500).send();
                })
        })
        .catch(error => {
            console.log(error);
            res.status(500).send();
        })
})

app.post('/getSprints' , async (req,res) => {
    try {
        const data = await Permission.aggregate([
            {
                $match : {
                    userID : mongoose.Types.ObjectId(req.body.id)
                }
            },
            {
                $lookup : {
                    from : 'sprints',
                    localField : 'sprintID',
                    foreignField : '_id',
                    as : 'sprint'
                }
            }
        ])
        if(!data)
        {
            res.status(404).send()
        }
        res.status(200).send(data);
    }
    catch(error) {
        console.log(error);
        res.send(error);
    }
})

app.post('/permissions' , async(req,res) => {
    const userEmail = req.body.userEmail;
    const id = mongoose.Types.ObjectId(req.body.id);
    const sprintID = mongoose.Types.ObjectId(req.body.sprintID);
    const role = req.body.role;
    try {
        const user = await User.findOne({email : userEmail})
        if(!user)
        {
            return res.status(403).send('User doesnot exists');
        }
        const permissionExists = await Permission.countDocuments({userID : user._id , sprintID : sprintID})  > 0
        if(permissionExists)
        {
            return res.status(403).send('Permission already exists');
        }
        const authorizedUser = await Permission.findOne({sprintID : sprintID , userID : id});
        if(authorizedUser.role !== 'Creator' && authorizedUser.role !== 'Admin')
        {
            return res.status(403).send('UN-authorized');
        }
        const newPermission = new Permission({userID : user._id , sprintID : sprintID , role : role})
        const grantedPermission = await newPermission.save()
        if(grantedPermission)
        {
            res.status(200).send('Permission granted to user');
        }
        else
        {
            res.status(500).send('Failed to grant permission');
        }
    }
    catch(error) {
        console.log(error);
        res.status(500).send('Failed to grant permission');
    }
})

app.post('/tasks' , async(req,res) => {
    const id  = mongoose.Types.ObjectId(req.body.id);
    const sprintID = mongoose.Types.ObjectId(req.body.sprintID);
    const description = req.body.description;
    const permissions = await Permission.findOne({userID : id , sprintID : sprintID})
    if(!permissions)
    {
        res.status(403).send('You dont have permissions');
        return;
    }
    const user = await User.findOne({_id : id})
    const newLog = new Log({sprintID : sprintID , description : user.name +` created a new task (${description}) at  ` + moment().format('MMMM Do YYYY, h:mm:ss a').toString()})
    const newTask = new Task({sprintID : sprintID , description : description , status : "Pending"})
    const taskSaved = await newTask.save();
    const logSaved = await newLog.save();
    if(taskSaved && logSaved)
    {
        res.status(201).send('Task Added Successfully');
    }
    else
    {
        res.status(500).send('Failed to create task');
    }
    
})
app.post('/updateTasks' , async(req,res) => {
    const  id = mongoose.Types.ObjectId(req.body.id);
    const taskID = mongoose.Types.ObjectId(req.body.taskID);
    const newStatus = req.body.newStatus;
    try {
        const user = await User.findById(id);
        if(!user)
        {
            res.status(404).send('Task Not Found');
            return;
        }
        const task = await Task.findById(taskID);
        if(!task)
        {
            res.status(404).send('Task not found');
            return;
        }
        const permitted = await Permission.countDocuments({userID : id , sprintID : task.sprintID}) > 0
        if(permitted)
        {
            const updatedTask = await Task.findByIdAndUpdate(req.body.taskID,{status : newStatus})
            const newLog = new Log({sprintID : task.sprintID , description : user.name+ ` updated the status to ${newStatus} of `+ task.description + ` at ` + moment().format('MMMM Do YYYY, h:mm:ss a').toString()})
            const logSaved = newLog.save();
            if(updatedTask && logSaved)
            {
                res.status(200).send('Task Updated');
            }
            else
            {
                res.status(500).send('Internal Server Error');
                return;
            }
        }
        else
        {
            res.status(403).send('Permission Denied');
            return;
        }
    }
    catch(error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/getTasks' , async(req,res) => {
    const id = mongoose.Types.ObjectId((req.body.id));
    const sprintID = mongoose.Types.ObjectId(req.body.sprintID);
    try {
        const allowed = await Permission.countDocuments({userID : id , sprintID : sprintID}) > 0
        if(!allowed)
        {
            res.status(403).send();
        }
        const tasks = await Sprint.aggregate([
            {
                $match : {
                    _id : sprintID
                }
            },
            {
                $lookup : {
                    from : 'tasks',
                    localField : '_id',
                    foreignField : 'sprintID',
                    as : 'tasks'
                }
            }
        ])
        if(!tasks)
        {
            res.status(404).send("Tasks not Found");
            return;
        }
        res.status(200).send(tasks);
    }
    catch(error) {
        res.status(500).send('Internal Server Error');
    }
})

app.post('/getLogs' , async(req,res) => {
    const sprintID = mongoose.Types.ObjectId(req.body.sprintID);
    try {
        const logs = await Sprint.aggregate([
            {
                $match : {
                    _id : sprintID
                }
            },
            {
                $lookup : {
                    from : 'logs',
                    localField : '_id',
                    foreignField : 'sprintID',
                    as : 'logs'
                }
            }
        ])
        if(!logs)
        {
            res.status(404).send("Logs not Found");
            return;
        }
        res.status(200).send(logs);
    }
    catch(error) {
        res.status(500).send('Internal Server Error');
    }
})
app.listen(port, () => {
    console.log('Server Running on ' + port);
})