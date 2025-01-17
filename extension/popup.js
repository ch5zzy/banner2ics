var exportToIcsButtonHTML = '<button id="export-ics-button" class="btn accent-4" style="margin: 5px 0;letter-spacing: 0px;"><i class="material-icons left fa fa-download"></i>Export to .ics file</button>';
var banner_example_image = "<img id='banner-example-image' src='banner-example.png' style='width: 100%'>"
var courses = null;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

	if (message["data"] === "schedule_details_not_selected") {
   		document.getElementById("pagecodediv").innerHTML = "<br>You are almost there! Please select the <b>schedule details tab</b> as shown below:<br><br> <img id='banner-example-image' src='schedule_details.png' style='width: 100%'>";
   		document.getElementById("banner-example-image").style.display = "block";
	} else {
		courses = message["data"];
		update_table();
	}
    sendResponse({
        data: message
    }); 
});

window.onload = function() {

	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
	    let url = tabs[0].url;
	   	if (url.indexOf("StudentRegistrationSsb/ssb/registrationHistory/registrationHistory") > -1) {
	   		var port = chrome.runtime.connect();
	   		port.postMessage({
	   			"from": "popup",
	   			"start": "scrap_web"
	   		});

	   		document.getElementById("redirect-button").remove();
	   	} else {
	   		document.getElementById("pagecodediv").innerHTML = "<p>Please navigate to the Banner Schedule Details page as shown below and return to the extension:</p> <b> <img id='banner-example-image' src='banner-example.png' style='width: 100%'>";
   			document.getElementById("banner-example-image").style.display = "block";
	   	}
	    // use `url` here inside the callback because it's asynchronous!
	});


};

 async function update_table() {
	document.querySelector('#button-div').innerHTML += "<br>" + exportToIcsButtonHTML;
	var exportToICSButton = document.getElementById("export-ics-button");
	exportToICSButton.addEventListener("click", function() {
		document.getElementById("export-ics-button").remove();
		document.getElementById("pagecodediv").innerHTML = "<br>Once it finishes downloading, upload it to <a target='_blank' href='https://calendar.google.com/calendar/r/settings/export'>Google Calendar</a>, or import the file into another calendar app yourself. </br></br>Make sure to create a new empty calendar upon importing if you prefer your course schedule in its own separate calendar."
		exportScheduleToIcs(courses, courses[0].selected_semester, courses[0].meeting_window[1]);
	}, false);
	
	build_preview();
	for (let i = 0; i < courses.length; i++) {
		document.getElementById(courses[i].id + "-button").addEventListener("click", function() {
			console.log(this.id);
			var course_id = this.id.replace("-button", "");
			document.getElementById(this.id.replace("-button", "")).remove();
			remove_course(course_id);
		});
	}
}

function build_preview() {
	var table_str = "";
	// document.getElementById("pagecodediv").innerHTML = "";
	table_str += "<p>Here are all courses found: </p>";
	document.getElementById("schedule").innerHTML = "";
	// opens a communication between scripts
	// document.getElementById("banner-example-image").style.display = "none";
	var all_courses_online = true;
	 for(let i = 0; i < courses.length; i++){
		
	   		table_str += "<div id = '" + courses[i]["id"] + "'>";
			table_str += "<hr>";   
			table_str += courses[i]["course_title"]+ " ( CRN: " + courses[i]["course_crn"] + " )";
	   		table_str += "</br>";
	   		
	   		if (courses[i]["meeting_times"] === "Online") {
				table_str += "Online";
				table_str += '<i id = ' + courses[i]["id"] + "-button" + ' value="' + courses[i]["id"] + '" style="float: right; color: red;" class="fa fa-trash small delete-course"></i>';
				table_str += "<br>";
				table_str += "<br>";
	   			i += 1;
		   		table_str += "</div>";
	   			continue;
	   		} else {
				all_courses_online = false;
				table_str +=  courses[i]["meeting_building"] + " " + courses[i]["meeting_room"];
				table_str += '<i id = ' + courses[i]["id"] + "-button" + ' value="' + courses[i]["id"] + '" style="float: right; color: red;" class="fa fa-trash small delete-course"></i>';
				table_str += "</br>";
		   		for (var j = 0; j < courses[i]["meeting_days"].length; ++j) {
		   			
		   			switch(courses[i]["meeting_days"][j]) {
		   				case "Monday":
		   					table_str += "Mon, ";
		   					break;
		   				case "Tuesday":
		   					table_str += "Tues, ";
		   					break;
		   				case "Wednesday":
		   					table_str += "Wed, ";
		   					break;
		   				case "Thursday":
		   					table_str += "Thurs, ";
		   					break;
		   				case "Friday":
		   					table_str += "Fri, ";
		   					break;
		   				case "Saturday":
		   					table_str += "Sat, ";
		   					break;
		   				case "Sunday":
		   					table_str += "Sun, ";
		   					break;
		   			}
		   			// table_str += table["table"][i]["meeting_days"][j] + ", ";
		   		}
	   			table_str += courses[i]["meeting_times"][0] + " to " + courses[i]["meeting_times"][1];
	   			// step_size += courses[i]["meeting_days"].length - 1;
				
				table_str += "</div>";
			}
	}
	table_str += "<hr>";
	if (all_courses_online === true) {
		document.querySelector("#pagecodediv").innerHTML = "<br> All of the courses for the selected semester are all online and do not have a meeting time.<br><br> Please select a different semester and return to this page to continue.";
		document.querySelector('#export-ics-button').remove();
	} else {
		document.getElementById("schedule").innerHTML = table_str;
	}
}

function remove_course(id) {
	courses = courses.filter(function(obj) {
		return obj.id !== id;
	});
	if (courses.length <= 0) {
		document.querySelector("#pagecodediv").innerHTML = "<br> There are no courses left to import/export, Please try again.";
		document.querySelector('#export-ics-button').remove();
	}
}

function all_courses_online(courseEventInfo) {
	var all_courses_online = true;
	for (var i = 0; i < courseEventInfo.length; i++) {
		var course = courseEventInfo[i];
		if (course.meeting_times === "Online" || course.meeting_times === undefined)
			continue;
		all_courses_online = false;
	}

	return all_courses_online;
}

/**
 * Similar to #importEvents, but instead of POSTing to Google Calendar, writes to an .ics file
 * @param {*} courseEventInfo
 * @param {*} viewedSemeseter
 * @param {*} semEndDate
 */
async function exportScheduleToIcs(courseEventInfo, viewedSemester, semEndDate) {
  // Initialize ics.js
  var cal = ics();

  var semEndDateParam = new Date(semEndDate);
  semEndDateParam.setDate(semEndDateParam.getDate() + 1);

  for (var i = 0; i < courseEventInfo.length; i++) {
    var course = courseEventInfo[i];
    if (course.meeting_times === "Online" || course.meeting_times === undefined)
    	continue;
	var classStartDate = new Date(new Date(course.meeting_window[0]));
	var classEndDate = new Date(new Date(course.meeting_window[0]));
	
	await adjust_datetime(course, classStartDate, classEndDate);

	rrule = {
		freq: 'WEEKLY',
		byday: course.meeting_days.map(meeting_day => byday_format_day(meeting_day)),
		until: semEndDateParam.toJSON(),
	};
	
    const summary = course.course_title;
    const description = "Room: " + course.meeting_room + "<br>Instructor: " + course.instructor_name + "<br>CRN: " + course.course_crn;
    const location = course.meeting_building;
    const begin = classStartDate.toJSON();
    const end = classEndDate.toJSON();
    cal.addEvent(summary, description, location, begin, end, rrule)
  }

  const filename = viewedSemester;
  cal.download(filename);
}

function delete_course(course_id) {
	alert(course_id);
}

function byday_format_day(meeting_day) {
	switch (meeting_day) {
		case "Sunday":
			return "SU";
		case "Monday":
			return "MO";
		case "Tuesday":
			return "TU";
		case "Wednesday":
			return "WE"
		case "Thursday":
			return "TH";
		case "Friday":
			return "FR";
		case "Saturday":
			return "SA";
	}

	return undefined;
}

function adjust_datetime(course, classStartDate, classEndDate) {
	var semFirstDay = new Date(course.meeting_window[0]);
	semFirstDay = semFirstDay.getDay();
	let classDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var classStartDay = 0;

	for (let i = 0; i < course.meeting_days.length; i++) {
		classStartDay = classDays.indexOf(course.meeting_days[i]);

		dayOffset = semFirstDay - classStartDay;
		// select the class start day that occurs on/after the semester begins
		if (dayOffset <= 0) break;
	}

	// no class start days occurred after the semester started, start next week
	if (dayOffset > 0) classStartDay = classDays.indexOf(course.meeting_days[0]);

	dayOffset = semFirstDay - classStartDay;
	
	if (dayOffset == 0) {	// class day is same as semester start day
		//do nothing; the day is correct
	} else if (dayOffset > 0) {	// first class day is before semester start day
		// start the second week of the semester
		classStartDate.setDate(classStartDate.getDate() + 7 - dayOffset);
		classEndDate.setDate(classEndDate.getDate() + 7 - dayOffset);
	} else { // first class day is after semester start day
		classStartDate.setDate(classStartDate.getDate() + Math.abs(dayOffset));
		classEndDate.setDate(classEndDate.getDate() + Math.abs(dayOffset));
	}

	classStartDate.setHours(parseInt(course.meeting_times[0].match(/(\d+)/g)[0]));
	classStartDate.setMinutes(parseInt(course.meeting_times[0].match(/(\d+)/g)[1]));

	classEndDate.setHours(parseInt(course.meeting_times[1].match(/(\d+)/g)[0]));
	classEndDate.setMinutes(parseInt(course.meeting_times[1].match(/(\d+)/g)[1]));

    // Set start/end dates taking into consideration am/pm
    if (parseInt(classStartDate.getHours()) < 12 && course.meeting_times[0].substr(-2) === "PM") {
      classStartDate.setHours(classStartDate.getHours() + 12);
    }
    if ( parseInt(classEndDate.getHours()) < 12 && course.meeting_times[0].substr(-2) === "PM") {
      classEndDate.setHours(classEndDate.getHours() + 12);
    }
}


async function importEvents(calId, token, courseEventInfo, semEndDate) {
  var semEndDateParam = new Date(semEndDate);

  semEndDateParam.setDate(semEndDateParam.getDate() + 1);
  semEndDateParamStr = semEndDateParam.toJSON().substr(0, 4) + semEndDateParam.toJSON().substr(5, 2) + semEndDateParam.toJSON().substr(8, 2);
  var postImportActionsCalled = false;
  var all_courses_online = true;

  for (var i = 0; i < courseEventInfo.length; i++) {
    // POST request to create a new event
    var url = "https://www.googleapis.com/calendar/v3/calendars/" + calId + "/events";

    var course = courseEventInfo[i];
    
    if (course.meeting_times === "Online" || course.meeting_times === undefined)
    	continue;
	
	var classStartDate = new Date(new Date(course.meeting_window[0]));
	var classEndDate = new Date(new Date(course.meeting_window[0]));
 	
 	await adjust_datetime(course, classStartDate, classEndDate);

    var params = {
      "summary": course.course_title,
      "location": course.meeting_building,
      "description": "CRN: " + course.course_crn + "<br>" + "Room: " + course.meeting_room + "Instructor: " + course.instructor_name,
      "colorId"	: course.group,
      "start": {
        "dateTime": classStartDate.toJSON(),
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": classEndDate.toJSON(),
        "timeZone": "America/New_York"
      },
      "recurrence": [
        "RRULE:FREQ=WEEKLY;UNTIL=" + semEndDateParamStr
      ]
    };

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    //Send the proper header information along with the request
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);

    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE && !postImportActionsCalled) {
        postImportActions();
        postImportActionsCalled = true;
      }
    }

    xhr.send(JSON.stringify(params));
  }
}

// After schedule has been imported
function postImportActions() {
  window.open('https://calendar.google.com/calendar/render#main_7%7Cmonth', '_blank');
}