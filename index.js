const fs = require("fs");
const express = require('express');
const multer = require("multer");
const app = express();
const upload = multer({ dest: "upload/" });
let mongoose = require("mongoose");
app.use(express.static("sources",{
    setHeaders:function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*')
    }
}));
mongoose.connect('mongodb://localhost/QQmusic',{ useUnifiedTopology: true ,useNewUrlParser: true});
let db = mongoose.connection;


const bodyParser = require('body-parser');
app.use(bodyParser.json());//数据JSON类型
app.use(bodyParser.urlencoded({ extended: false }));//解析post请求数据


const user=mongoose.model('user',new mongoose.Schema({
    name: String,
    id:String,
    password:String,
    time:String,
    musicList:Array,
    Administrator:Boolean
}),"user");

const musiclist=mongoose.model('musiclist',new mongoose.Schema({
    name: String,
    singer:String,
    album:String,
    time:String,
    link_url:String,
    cover:String,
    link_lrc:String,
    userLike:Array,
}),"musiclist");

// 设置跨域
app.all('*', (req, res, next) => {
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
    res.header('X-Powered-By', '3.2.1');
    res.header('Content-type', 'application/json;charset=utf-8');
    next()
});

let usersMusicList = [];
let musicList = [];
let musicData = async function(){return musiclist.find({})};
musicData().then(res =>{
    musicList = res;
    res.forEach((val,index) => {
        usersMusicList.push(val.id)
    })
});
//音乐列表接口
app.get('/',async function(req, res) {
    console.log(req.query);
    if (req.query.id === "") return res.json(musicList);
    let userMusicList = await user.find({_id:req.query.id});
    let data = await musiclist.find({_id:userMusicList[0].musicList});
    res.json(data);
});
//收藏接口
app.get('/like',async function(req, res) {
    let id = req.query.id;
    let musicID = req.query.musicID;
    if (req.query.modified === "add") {
        musiclist.updateMany({
            _id: musicID
        }, {$addToSet: {userLike: id}},(err,doc) => {
            if (!err) {
                res.json(doc.nModified);
            }else {
                console.log(err);
            }
        });
    }else if (req.query.modified === "remove") {
        musiclist.updateOne({
            _id: musicID
        }, {$pull: {userLike: id}},(err,doc) => {
            if (!err) {
                res.json(doc.nModified);
            }
        });
    }


});
//删除接口
app.get('/remove',async function(req,res) {
    user.updateOne({_id:req.query.id},{$pullAll:{musicList:req.query.musicID}},(err,data) => {
        if (!err) {
            res.json(data.nModified)
        }else {
            throw err
        }
    })
});
//注册登录接口
app.post('/',async function(req, res) {
    let json = {
        "i":-1,
        "name":"",
        "id":"",
    };
    await user.find({
        id:req.body.id
    },(err,data) => {
        if (!err) {
            f(req,data,json,res)
        }
    });
    /**/
});

app.post('/png',upload.array("file", 2), async function (req,res,next) {

    console.log(req.body);
    console.log(req.files);
    var files = req.files;
    var fileName = "";
    if (files.length > 0) {
        files.forEach(item => {
            fileName = new Date().getTime() + "-" + item.originalname;
            fs.renameSync(item.path, __dirname + "\\upload" + "\\" + fileName);
        });
        res.send({ code: 1, url: "127.0.0.1:3001/" + fileName });
    } else {
        res.send({ code: 0 });
    }
})

const port = process.env.PORT || 3001;

app.listen(port, () => {
    console.log('Express server listening on port ' + port);
});

// 2. 监听各种状态
db.on('error', ()=>{
    console.log("连接失败!");
});

db.once('open', function() {
    console.log('链接成功')
});

db.once('close', function() {
    console.log("数据库断开成功!");
});

async function f(req, data ,json,res) {
    if(data.length===0){
        if (req.body.name !== undefined){
            await user.create({
                name:req.body.name,
                id:req.body.id,
                password:req.body.pass,
                time: req.body.time,
                musicList:usersMusicList,
                Administrator:false
            },err => {
                if(!err){
                    json.i = 1
                    res.json(json);
                }else {
                    throw err
                }
            })
        }else {
            json.i = 2;
            res.json(json);
        }
    }else {
        if (req.body.name === undefined) {
            if (req.body.pass !== data[0].password) {
                json.i = 3;
                res.json(json);
                return true
            }
        }
        json.i = 0;
        json.name = data[0].name;
        json.id = data[0]._id;
        res.json(json);
    }
}