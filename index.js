const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true }).then(
	() => console.log("MongoDB Connected!")
).catch(
	err => console.log(err)
);
const userSchema = new mongoose.Schema({
	username: {type: String, required: true},
});

const exerciseSchema = new mongoose.Schema({
	user_id: {type: String, required: true},
	description: {type: String, required: true},
	date_str: {type: String, required: true},
	duration: {type: Number, required: true},
});

const exerciseModel = mongoose.model("exerciseModel", exerciseSchema);
const userModel = mongoose.model("userModel", userSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', function (req, res) {
	const username = req.body.username;
	if (!username || !username.length) {
		res.json({errorUsername: req.body.username});
	}
	const userDemo = new userModel({username: username});
	userDemo.save().then((user) => {
		res.json({'_id': user["_id"], 'username': user.username});
	}).catch((err) => {
		res.json({err: err});
	});
})

app.get('/api/users', (req, res) => {
	userModel.find().select({__v: 0}).then((users) => {
		res.json(users);
	}).catch(
		err => {
			res.json({'get_users_err': err});
		}
	)
});

app.post('/api/users/:_id/exercises', (req, res) => {
	const user_id = req.params._id;
	const description = req.body.description;
	const duration = req.body.duration;
	let dt = req.body.date;
	let new_date = new Date();
	if (dt !== undefined) {
		new_date = new Date(dt);
	}
	const date_str = new_date.toDateString();
	const exerciseDemo = new exerciseModel({
		user_id: user_id,
		description: description,
		duration: duration,
		date_str: date_str,
	});
	exerciseDemo.save().then((exercise) => {
		userModel.findById(exercise.user_id).then(
			(user) => {
				res.json({
					username: user["username"],
					description: exercise.description,
					duration: exercise.duration,
					date: exercise.date_str,
					_id: user["_id"],
				});
			});
	}).catch((err) => {
		res.json({err: err});
	});
});

app.get('/api/users/:_id/logs', (req, res) => {
	const id = req.params._id;
	let nums = parseInt(req.query.limit);
	let from = req.query.from;
	let to = req.query.to;
	if (nums === undefined || nums === null || nums <= 0 || isNaN(nums) || nums
	    > 20) {
		nums = 20;
	}
	let from_date = new Date('1970-01-01').valueOf();
	let to_date = new Date().valueOf();
	if (from !== undefined) {
		from_date = new Date(from).valueOf();
	}
	if (to !== undefined) {
		to_date = new Date(to).valueOf();
	}
	exerciseModel.find({user_id: id}).limit(nums).then((exercises) => {
		const map_log = exercises.map(exercise => {
			return {
				description: exercise["description"],duration: exercise["duration"],
				date: exercise["date_str"]
			}
		});
		
		let log = map_log.filter((log) => {
			const date_value = new Date(log.date).valueOf();
			return date_value >= from_date && date_value <= to_date;
		});
		const count = log.length;
		
		if (count === 0) {log = [{}]; }
		userModel.findById(id).then((user) => {
			const rs = {
				username: user["username"],
				count: count,
				_id: id,
				log: log
			};
			console.log(rs);
			res.json(rs);
		});
	}).catch(err => console.log('err-exs', err));
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})
