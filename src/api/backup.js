import { version } from '../../package.json';
import { Router } from 'express';
import clearbit_client from 'clearbit';
import mysql from 'mysql';
import * as request from "request-promise";
import 'babel-polyfill';
import 'isomorphic-fetch';


export default ({ config, db }) => {

	let clearbit = clearbit_client('sk_cc85a3f828e324514428d0f535473922');

	// First you need to create a connection to the db
	global.xdb = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: 'Root@123',
		database: 'projectx'
	});

	xdb.connect((err) => {
		if (err) {
			console.log('Error connecting to Db');
			return;
		}
		console.log('Connection established');
	});

	global.all_users = [];

	let api = Router();

	api.get('/setCustomerData', (req, res) => {

		let domainName = req.query.domain;
		if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
			res.json({ "status": "Error", "Reason": "Invalid domain" });
			return;
		}
		clearbit.Prospector.search({ domain: domainName })
			.then(function (people) {
				people.forEach(function (person) {
					console.log(person);
					// console.log(person.name.fullName, person.title);

					let temp_arrdomain = "";

					for (let i = 0; i < person.company.length; i++) {
						const element = person.company[i];

						console.log("Company is ", element);
						if (i == 0) {
							temp_arrdomain = element;
						} else {
							temp_arrdomain = temp_arrdomain + " , " + element;
						}
					}

					console.log("temp_arrdomain ", temp_arrdomain);
					
					//EDS data
					// let eds_response_data;

					async function fetchAsync() {
						let response = await fetch('https://api.myjson.com/bins/b5bbo');
						let data = await response.json();
						return data;
					}

					fetchAsync()
						.then(data => {
							let eds_data = data;
							console.log("eds_data", eds_data.deliverabilityIndexes[0]);

							const temp_domain = {
								personid: person.id,
								email: person.email,
								domain_name: domainName,
								fullname: person.name.fullName,
								title: person.title,
								role: person.role,
								seniority: person.seniority,
								company: temp_arrdomain,
								verified: true,
								json: JSON.stringify(person),
								eds: JSON.stringify(eds_data.deliverabilityIndexes),
								gmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.gmail.index),
								hotmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.hotmail.index),
								yahoo: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.yahoo.index),
							};
							xdb.query('INSERT INTO domain SET ?', temp_domain, (err, res) => {
								if (err){
									console.log(err);
								}

								console.log('Last insert ID:', res.insertId);
							});
						})
						.catch(reason => console.log(reason.message))
				});
				return people;
			})
			.catch(function (err) {
				console.error(err);
			});

		res.json({ "status": "success" });
	});

	api.get('/getCustomerData', (req, res) => {
		let domainName = req.query.domain;
		console.log("Domain received", domainName);
		if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
			res.json({ "status": "Error", "Reason": "Invalid domain" });
			return;
		}

		xdb.query('SELECT email, domain_name, fullname, title, role, seniority, company, verified, gmail, hotmail, yahoo FROM domain', (err, rows) => {
			if (err){
				console.log(err);
				res.json({"status" : "error", "Reason": err});
			}
			console.log('Data received from Db:\n');
			console.log(JSON.stringify(rows));

			res.json(rows);
			return;
		});
	});


	api.get('/getCompanyData', (req, res) => {
		let domainName = req.query.domain;
		console.log("Domain received", domainName);
		if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
			res.json({ "status": "Error", "Reason": "Invalid domain" });
			return;
		}

		xdb.query('SELECT email, domain_name, fullname, title, role, seniority, company, verified, gmail, hotmail, yahoo FROM domain', (err, rows) => {
			if (err) {
				console.log(err);
				res.json({ "status": "error", "Reason": err });
			}
			console.log('Data received from Db:\n');
			console.log(JSON.stringify(rows));

			res.json(rows);
			return;
		});
	});




	//Detailed
	api.get('/setCustomerData', (req, res) => {

		let domainName = req.query.domain;
		if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
			res.json({ "status": "Error", "Reason": "Invalid domain" });
			return;
		}
		clearbit.Prospector.search({ domain: domainName })
			.then(function (people) {
				people.forEach(function (person) {
					console.log(person);
					// console.log(person.name.fullName, person.title);

					let temp_arrdomain = "";

					for (let i = 0; i < person.company.length; i++) {
						const element = person.company[i];

						console.log("Company is ", element);
						if (i == 0) {
							temp_arrdomain = element;
						} else {
							temp_arrdomain = temp_arrdomain + " , " + element;
						}
					}

					console.log("temp_arrdomain ", temp_arrdomain);

					//EDS data
					// let eds_response_data;

					async function fetchAsync() {
						let response = await fetch('https://api.myjson.com/bins/b5bbo');
						let data = await response.json();
						return data;
					}

					fetchAsync()
						.then(data => {
							let eds_data = data;
							console.log("eds_data", eds_data.deliverabilityIndexes[0]);

							const temp_domain = {
								personid: person.id,
								email: person.email,
								domain_name: domainName,
								fullname: person.name.fullName,
								title: person.title,
								role: person.role,
								seniority: person.seniority,
								company: temp_arrdomain,
								verified: true,
								json: JSON.stringify(person),
								eds: JSON.stringify(eds_data.deliverabilityIndexes),
								gmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.gmail.index),
								hotmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.hotmail.index),
								yahoo: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.yahoo.index),
							};
							xdb.query('INSERT INTO domain SET ?', temp_domain, (err, res) => {
								if (err) {
									console.log(err);
								}

								console.log('Last insert ID:', res.insertId);
							});
						})
						.catch(reason => console.log(reason.message))
				});
				return people;
			})
			.catch(function (err) {
				console.error(err);
			});

		res.json({ "status": "success" });
	});



	return api;
}