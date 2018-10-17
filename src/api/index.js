import { version } from '../../package.json';
import { Router } from 'express';
import clearbit_client from 'clearbit';
import mysql from 'mysql';
import * as request from "request-promise";
import 'babel-polyfill';
import 'isomorphic-fetch';
import { Z_DATA_ERROR } from 'zlib';
var dbclient = require('../dbconnection');


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

	api.get('/setCompanyData', (req, res) => {

		let domainName = req.query.domain;
		if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
			res.json({ "status": "Error", "Reason": "Invalid domain" });
			return;
		}

		var Company = clearbit.Company;
		Company.find({ domain: domainName })
			.then(function (company) {
				async function fetchAsync() {
					let response = await fetch('https://api.myjson.com/bins/b5bbo');
					let data = await response.json();
					return data;
				}
				function cleanString(input) {
					var output = "";
					for (var i = 0; i < input.length; i++) {
						if (input.charCodeAt(i) <= 255) {
							output += input.charAt(i);
						}
					}
					return output;
				}

				fetchAsync()
					.then(data => {
						let eds_data = data;
						// console.log("eds_data", eds_data.deliverabilityIndexes[0]);

						let tech_stack = (company.tech).join(",");

						const temp_company = {
							companyid: company.id,
							name: company.name,
							domain_name: company.domain,
							country: company.geo.country,
							alexaRank: company.metrics.alexaGlobalRank,
							employees: company.metrics.employees,
							employeesRange: company.metrics.employeesRange,
							estimatedAnnualRevenue: company.metrics.estimatedAnnualRevenue,
							industry: company.category.industry,
							industryGroup: company.category.industryGroup,
							sector: company.category.sector,
							tech_stack: tech_stack,
							linkedin: company.linkedin.handle,
							facebook: company.facebook.handle,
							facebook_likes: company.facebook.likes,
							twitter: company.twitter.handle,
							twitter_followers: company.twitter.followers,
							json_raw: cleanString(JSON.stringify(company)),
							eds_raw: cleanString(JSON.stringify(eds_data.deliverabilityIndexes)),
							gmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.gmail.index),
							hotmail: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.hotmail.index),
							yahoo: JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.yahoo.index),
						}
						dbclient.query('INSERT INTO domain SET ?', temp_company, (err, result) => {
							if (err) {
								console.log(err.sqlMessage);
								if (!res.headersSent) {
									res.json({ "status": "Error", "Reason": err.sqlMessage });
									return;
								}
							}

							if (result !== undefined) {
								console.log('Last insert ID:', result.insertId);
							}
							if (!res.headersSent) {
								res.json({ "status": "success" });
								return;
							}
						});
					})
					.catch(Company.QueuedError, function (err) {
						console.log(err); // Company is queued
						res.json({ "status": "Error", "Reason": err });
						return;
					})
					.catch(Company.NotFoundError, function (err) {
						console.log(err); // Company could not be found
						res.json({ "status": "Error", "Reason": err });
						return;
					}).catch((reason) => {
						console.log(reason.message);
						if (!res.headersSent) {
							res.json({ "status": "Error", "Reason": reason.message });
							return;
						};
					})
					.catch(function (err) {
						console.log('Bad/invalid request, unauthorized, Clearbit error, or failed request');
						res.json({ "status": "Error", "Reason": 'Bad/invalid request, unauthorized, Clearbit error, or failed request' });
						return;
					});

				res.json({ "status": "success" });
			});



		api.get('/getCompanyData', (req, res) => {
			let domainName = req.query.domain;
			console.log("Domain received", domainName);
			if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
				res.json({ "status": "Error", "Reason": "Invalid domain" });
				return;
			}

			xdb.query('SELECT name, domain_name, country, alexaRank, employees, employeesRange, estimatedAnnualRevenue, industry, industryGroup, sector, tech_stack, linkedin, facebook, facebook_likes, twitter, twitter_followers, gmail, hotmail, yahoo FROM domain where domain_name like "' + domainName + '"', (err, rows) => {
				if (err) {
					console.log(err);
					res.json({ "status": "error", "Reason": err });
				}
				console.log('Data received from Db:');
				console.log(JSON.stringify(rows));

				res.json(rows);
				return;
			});
		});



		api.get('/deleteCompanyData', (req, res) => {
			let domainName = req.query.domain;
			console.log("Domain received", domainName);
			if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
				res.json({ "status": "Error", "Reason": "Invalid domain" });
				return;
			}

			dbclient.query('delete FROM domain where domain_name like "' + domainName + '"', (err, rows) => {
				if (err) {
					console.log(err);
					res.json({ "status": "error", "Reason": err });
				}
				console.log('Data received from Db:');
				console.log(JSON.stringify(rows));

				res.json(rows);
				return;
			});
		});


		//2nd set call
		api.get('/setCustomerData', (req, res) => {

			let domainName = req.query.domain;
			if (domainName === undefined || domainName === "" || domainName.indexOf(".") < 0) {
				res.json({ "status": "Error", "Reason": "Invalid domain" });
				return;
			}

			let arrRoles = [];
			if (req.query.roles !== undefined || req.query.roles !== "") {
				arrRoles = req.query.roles.split(","); arrRoles;
			}

			let roleType = [];
			if (req.query.roleType == "senior") {
				roleType = ["ceo", "founder", "president"];
				arrRoles = roleType;
			}

			let total_records = 0;
			clearbit.Prospector.search({ domain: domainName, roles: arrRoles })
				.then(function (people) {
					people.forEach(function (person) {
						// console.log(person);
						// console.log(person.name.fullName, person.title);

						let headers = new Headers();
						headers.set('Authorization', 'Basic ' + Buffer.from("sk_cc85a3f828e324514428d0f535473922:" + '').toString('base64'));

						async function fetchAsync() {
							let response = await fetch('https://person.clearbit.com/v2/combined/find?email=' + person.email, {
								method: 'GET',
								headers: headers,
							});
							// let response = await fetch('https://api.myjson.com/bins/b96zg');
							let data = await response.json();
							return data;
						}

						fetchAsync()
							.then(data => {
								let person_data = data;

								const temp_cust = {
									personid: person_data.person.id,
									fullname: person_data.person.name.fullName,
									email: person_data.person.email,
									domain_name: domainName,
									location: person_data.person.location,
									country: person_data.person.geo.country,
									title: person.title,
									role: person.role,
									seniority: person.seniority,
									facebook: person_data.person.facebook.handle,
									twitter: person_data.person.twitter.handle,
									twitter_followers: person_data.person.twitter.followers,
									linkedin: person_data.person.linkedin.handle,
									company: person.company.name,
									personjson: JSON.stringify(person_data)
								};
								// console.log(person);
								xdb.query('INSERT INTO customer SET ?', temp_cust, (err, result) => {
									if (err) {
										console.log(err.sqlMessage);
										if (!res.headersSent) {
											res.json({ "status": "Error", "Reason": err.sqlMessage });
											return;
										}
									}

									if (result !== undefined) {
										total_records++;
										console.log('Last insert ID:', result.insertId);
									}
									if (!res.headersSent) {
										res.json({ "status": "success" });
										return;
									}

								});
							}).catch(reason => console.log(reason.message))
					});
					res.json({ "status": "Error", "Reason": total_records + " records inserted" });
					return;
				})
				.catch(function (err) {
					console.log('Bad/invalid request, unauthorized, Clearbit error, or failed request');
					res.json({ "status": "Error", "Reason": 'Bad/invalid request, unauthorized, Clearbit error, or failed request' });
					return;
				});
		});

		api.get('/getCustomerData', (req, res) => {
			let emailData = req.query.email;
			console.log("email received", emailData);
			if (emailData === undefined || emailData === "" || emailData.indexOf("@") < 0) {
				res.json({ "status": "Error", "Reason": "Invalid Email" });
				return;
			}

			xdb.query('SELECT email, fullname, domain_name, location, country, title, role, seniority, facebook, twitter, twitter_followers, linkedin, company FROM customer where email = "' + emailData + '"', (err, rows) => {
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

		api.get('/deleteCustomerData', (req, res) => {
			let emailData = req.query.email;
			console.log("email received", emailData);
			if (emailData === undefined || emailData === "" || emailData.indexOf("@") < 0) {
				res.json({ "status": "Error", "Reason": "Invalid Email" });
				return;
			}

			xdb.query('delete FROM customer where email = "' + emailData + '"', (err, rows) => {
				if (err) {
					console.log(err);
					res.json({ "status": "error", "Reason": err });
				}
				console.log('Data received from Db:');
				console.log(JSON.stringify(rows));

				res.json(rows);
				return;
			});
		});

		return api;
	}