const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
const Schema = mongoose.Schema;

let userSchema = new Schema({
	username: { type: String, required: true },
});
let User = mongoose.model("user", userSchema);

let exerciseSchema = new Schema({
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});
let Exercise = mongoose.model("exercise", exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
});

app
	.route("/api/users")
	.post(function (req, res) {
		const username = req.body.username;
		User.findOne({ username }).exec(async function (err, data) {
			if (err) {
				console.error(err, "1");
			}
			if (!data) {
				let user = new User({ username });
				user.save(function (err, data) {
					if (err) {
						console.error(err);
					}
					res
						.type("json")
						.send(
							JSON.stringify(
								{ _id: data._id, username: data.username },
								null,
								2
							)
						);
				});
			} else {
				res
					.type("json")
					.send(
						JSON.stringify({ _id: data._id, username: data.username }, null, 2)
					);
			}
		});
	})
	.get(function (req, res) {
		User.find({})
			.select({ __v: 0 })
			.exec(function (err, data) {
				if (err) {
					console.error(err);
				}
				res.type("json").send(JSON.stringify(data, null, 2));
			});
	});

app.post("/api/users/:_id/exercises", function (req, res) {
	const { description, duration, date } = req.body;

	User.findById(req.body[":_id"], function (err, data) {
		let exerciseDate = new Date(req.body.date);
		if (!data) {
			res.json({ error: "Unknown _id" });
		} else {
			const { username } = data;
			console.log(req.body.date);
			if (!req.body.date || exerciseDate.toDateString() == "Invalid Date") {
				exerciseDate = new Date();
			}
			let exercise = new Exercise({
				username,
				description,
				duration,
				date: exerciseDate.toDateString(),
			});
			exercise.save(function (err, result) {
				if (err) {
					console.error(err, "4");
				} else {
					res.type("json").send(
						JSON.stringify(
							{
								username: result.username,
								description: result.description,
								duration: result.duration,
								_id: result.id,
								date: result.date.toDateString(),
							},
							null,
							2
						)
					);
				}
			});
		}
	});
});

app.get("/api/users/:_id/logs", function (req, res) {
	const { from, to, limit } = req.query;
	let id = req.params["_id"];

	User.findById(id, function (err, data) {
		if (!data) {
			res.json({ error: "Unknown _id" });
		} else {
			const { username } = data;
			let query = { username };
			let maxLimit = 100;

			if (from !== undefined && to === undefined) {
				query.date = { $gte: new Date(from) };
			} else if (from === undefined && to !== undefined) {
				query.date = { $lte: new Date(to) };
			} else if (from !== undefined && to !== undefined) {
				query.date = { $gte: new Date(from), $lte: new Date(to) };
			}

			Exercise.find(query)
				.limit(limit ? +limit : maxLimit)
				.exec(function (err, result) {
					if (err) {
						console.error(err, "6");
					} else {
						res.type("json").send(
							JSON.stringify(
								{
									username,
									count: result.length,
									_id: id,
									log: result.map((exercise) => {
										const { description, duration, date } = exercise;
										return { description, duration, date: date.toDateString() };
									}),
								},
								null,
								2
							)
						);
					}
				});
		}
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is listening on port " + listener.address().port);
});
