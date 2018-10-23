import { version } from '../../package.json';
import { Router } from 'express';
import clearbit_client from 'clearbit';
import mysql from 'mysql';
import * as request from "request-promise";
import 'babel-polyfill';
import 'isomorphic-fetch';
import { Z_DATA_ERROR } from 'zlib';
import { encode } from 'utf8';
var dbclient = require('../dbconnection');
import utf8 from 'utf8';


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

		async function fetchAsync(domain_name1) {
			console.log("EDS Query : https://deliveryindex.org/rest/delivery_index?domain=" + domain_name1);
			let response = await fetch('https://deliveryindex.org/rest/delivery_index?domain=' + domain_name1);
			// let response = await fetch('https://api.myjson.com/bins/b5bbo');
			let data = await response.json();
			return data;
		}

		var Company = clearbit.Company;
		Company.find({ domain: domainName })
			.then((company) => {
				fetchAsync(company.domain)
					.then(data => {
						let eds_data = data;
						let eds_raw_string = "Not Available";
						let gmail_string = "Not Available";
						let hotmail_string = "Not Available";
						let yahoo_string = "Not Available";

						console.log("eds_data:")
						console.log(eds_data)

						if (eds_data.type !== undefined && eds_data.type === "INVALID_INPUT") {
							console.log("EDS response : Invalid input, Failed to load delivery index response");
							eds_raw_string = "Failed to load delivery index";
							gmail_string = "Failed to load delivery index";
							hotmail_string = "Failed to load delivery index";
							yahoo_string = "Failed to load delivery index";
						} else if (eds_data.message !== undefined && eds_data.message === "Too many requests encountered from IP") {
							console.log("EDS response : Too many requests encountered from IP");
							eds_raw_string = "Too many requests from IP";
							gmail_string = "Too many requests from IP";
							hotmail_string = "Too many requests from IP";
							yahoo_string = "Too many requests from IP";
						} else {
							let eds_temp = (eds_data.deliverabilityIndexes) + "";
							eds_raw_string = JSON.stringify(eds_temp.replace(/[^\x00-\x7F]/g, ""));
							gmail_string = JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.gmail.index);
							hotmail_string = JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.hotmail.index);
							yahoo_string = JSON.stringify(eds_data.deliverabilityIndexes[0].ispToIndexMeasurement.yahoo.index);
						}

						let tech_stack = (company.tech).join(",");
						let new_company = JSON.stringify(company);

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
							json_raw: new_company.replace(/[^\x00-\x7F]/g, "") + "",
							eds_raw: eds_raw_string,
							gmail: gmail_string,
							hotmail: hotmail_string,
							yahoo: yahoo_string
						};

						// res.json({ "status": temp_company });

						dbclient.query('INSERT INTO domain SET ?', temp_company, (err, result) => {
							if (err) {
								console.log("Error while processing response ", err);
								console.log(res.headersSent);
								if (!res.headersSent) {
									console.log("sending error");
									res.json({ "status": "Error", "Reason": err });
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
						console.log("err-Q" + err); // Company is queued
						res.json({ "status": "Error", "Reason": err });
						return;
					})
					.catch(Company.NotFoundError, function (err) {
						console.log("err-NF" + err); // Company could not be found
						res.json({ "status": "Error", "Reason": err });
						return;
					}).catch(function (err) {
						console.log(err);
						res.json({ "status": "Error", "Reason": 'Bad/invalid request, unauthorized, Clearbit error, or failed request' });
						return;
					});
			}).catch(reason => console.log("reason", reason));
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

		let arr_seniority = [];
		if (req.query.roles !== undefined && req.query.roles !== "") {
			arr_seniority = req.query.seniority.split(",");
		}

		let seniority_type = [];
		if (req.query.seniority_type == "senior") {
			seniority_type = ["ceo", "founder", "cto", "director"];
			arr_seniority = seniority_type;
			// console.log("arr_seniority is ", arr_seniority);
			// console.log("typeof arr_seniority is ", typeof(arr_seniority));
		}

		clearbit.Prospector.search({ domain: domainName, seniority: arr_seniority })
			.then( (people) => {
				people.forEach( (person) => {
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
						// console.log("Ending sync fetch");
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
								personjson: JSON.stringify(person_data).replace(/[^\x00-\x7F]/g, "") + ""
							};
							console.log(temp_cust.fullname + temp_cust.seniority + "");
							xdb.query('INSERT INTO customer SET ?', temp_cust, (err, result) => {
								if (err) {
									console.log(err);
									if (!res.headersSent) {
										res.json({ "status": "Error", "Reason": err.sqlMessage });
										return;
									}
								}

								if (result !== undefined) {
									console.log('Last insert ID -', result.insertId);
									if (!res.headersSent) {
										res.json({ "status": "success" });
										return;
									}
								} else {
									res.json({ "status": "Error", "Reason": "Unknown failure when updating db. Results undefined" });
									return;
								}
							});
						}).catch(reason => console.log(reason))
				});
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