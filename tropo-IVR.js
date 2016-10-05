// QUICK START GUIDE
//
// 1. Clone this gists and make it private
// 2. Create an incoming integratin in a Spark Room from the Spark Web client : http://web.ciscospark.com
// 3. Replace YOUR_INTEGRATION_SUFFIX by the integration id, example: Y2lzY29zcGFyazovL3VzL1dFQkhPT0svZjE4ZTI0MDctYzg3MS00ZTdmLTgzYzEtM2EyOGI1N2ZZZZZ
// 4. Create your Tropo application pointing to your gist URL, append /raw/tropodevops-sample.js to the gist URL

//
// Cisco Spark Logging Library for Tropo
//

// Factory for the Spark Logging Library, with 2 parameters
//    - the name of the application will prefix all your logs,
//    - the Spark Incoming integration (to  which logs will be posted)
// To create an Incoming Integration
//   - click integrations in the right pane of a Spark Room (Example : I create a dedicated "Tropo Logs" room)
//   - select incoming integration
//   - give your integration a name, it will be displayed in the members lists (Example : I personally named it "from tropo scripting")
//   - copy your integration ID, you'll use it to initialize the SparkLibrary
function SparkLog(appName, incomingIntegrationID) {

    if (!appName) {
        appName = "";
        //log("SPARK_LOG : bad configuration, no application name, exiting...");
        //throw createError("SparkLibrary configuration error: no application name specified");
    }
    this.tropoApp = appName;

    if (!incomingIntegrationID) {
        log("SPARK_LOG : bad configuration, no Spark incoming integration URI, exiting...");
        throw createError("SparkLibrary configuration error: no Spark incoming integration URI specified");
    }
    this.sparkIntegration = incomingIntegrationID;

    log("SPARK_LOG: all set for application:" + this.tropoApp + ", posting to integrationURI: " + this.sparkIntegration);
}

// This function sends the log entry to the registered Spark Room
// Invoke this function from the Tropo token-url with the "sparkIntegration" parameter set to the incoming Webhook ID you'll have prepared
// Returns true if the log entry was acknowledge by Spark (ie, got a 2xx HTTP status code)
SparkLog.prototype.log = function(newLogEntry) {

    // Robustify
    if (!newLogEntry) {
        newLogEntry = "";
    }

    var result;
    try {
        // Open Connection
        var url = "https://api.ciscospark.com/v1/webhooks/incoming/" + this.sparkIntegration;
        var connection = new java.net.URL(url).openConnection();

        // Set timeout to 10s
        connection.setReadTimeout(10000);
        connection.setConnectTimeout(10000);

        // Method == POST
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");

        // TODO : check if this cannot be removed
        connection.setRequestProperty("Content-Length", newLogEntry.length);
        connection.setUseCaches(false);
        connection.setDoInput(true);
        connection.setDoOutput(true);

        //Send Post Data
        var bodyWriter = new java.io.DataOutputStream(connection.getOutputStream());
        log("SPARK_LOG: posting: " + newLogEntry + " to: " + url);
        var contents = '{ "text": "' + this.tropoApp + ': ' + newLogEntry + '" }'
        bodyWriter.writeBytes(contents);
        bodyWriter.flush();
        bodyWriter.close();

        var result = connection.getResponseCode();
        log("SPARK_LOG: read response code: " + result);

        if (result < 200 || result > 299) {
            log("SPARK_LOG: could not log to Spark, message format not supported");
            return false;
        }
    }
    catch (e) {
        log("SPARK_LOG: could not log to Spark, socket Exception or Server Timeout");
        return false;
    }

    log("SPARK_LOG: log successfully sent to Spark, status code: " + result);
    return true; // success
}


//
// Cisco Spark Client Library for Tropo
//

// Factory for the Spark Library, with 1 parameter
//    - the Spark API token
function SparkClient(spark_token) {

    if (!spark_token) {
        log("SPARK_CLIENT : bad configuration, no API token, exiting...");
        throw createError("SparkClient configuration error: no API token specified");
    }
    this.token = spark_token;

    log("SPARK_CLIENT: all set; ready to invoke spark");
}

// Returns a status code
SparkClient.prototype.createMemberShip = function(roomID, email) {

    // Robustify
    if (!roomID) {
        return 400;
    }
    if (!email) {
        return 400;
    }

    var result;
    try {
        // Open Connection
        var url = "https://api.ciscospark.com/v1/memberships";
        var connection = new java.net.URL(url).openConnection();

        // Set timeout to 10s
        connection.setReadTimeout(10000);
        connection.setConnectTimeout(10000);

        // Method == POST
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + this.token);

        // Prepare payload
        var payload = '{ "roomId": "' + roomID + '", "personEmail": "' + email + '", "isModerator": "false" }'

        // [TODO] Check if this cannot be removed
        connection.setRequestProperty("Content-Length", payload.length);
        connection.setUseCaches(false);
        connection.setDoInput(true);
        connection.setDoOutput(true);

        //Send Post Data
        var bodyWriter = new java.io.DataOutputStream(connection.getOutputStream());
        log("SPARK_CLIENT: posting: " + payload + " to: " + url);
        bodyWriter.writeBytes(payload);
        bodyWriter.flush();
        bodyWriter.close();

        result = connection.getResponseCode();
        log("SPARK_CLIENT: read response code: " + result);

    }
    catch (e) {
        log("SPARK_CLIENT: could not log to Spark, socket Exception or Server Timeout");
        return 500;
    }

    if (result < 200 || result > 299) {
        log("SPARK_CLIENT: could not add user with email: " + email + " to room:" + roomID);
    }
    else {
        log("SPARK_CLIENT: user with email: " + email + " added to room:" + roomID);
    }

    return result; // success
}


//
// Library to send outbound API calls
//

// Returns the JSON object at URL or undefined if cannot be accessed
function requestJSONviaGET(requestedURL) {
    try {
        var connection = new java.net.URL(requestedURL).openConnection();
        connection.setDoOutput(false);
        connection.setDoInput(true);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("charset", "utf-8");
        connection.connect();

        var responseCode = connection.getResponseCode();
        log("JSON_LIBRARY: read response code: " + responseCode);
        if (responseCode < 200 || responseCode > 299) {
            log("JSON_LIBRARY: request failed");
            return undefined;
        }

        // Read stream and create response from JSON
        var bodyReader = connection.getInputStream();
        // [WORKAROUND] We cannot use a byte[], not supported on Tropo
        // var myContents= new byte[1024*1024];
        // bodyReader.readFully(myContents);
        var contents = new String(org.apache.commons.io.IOUtils.toString(bodyReader));
        var parsed = JSON.parse(contents);
        log("JSON_LIBRARY: JSON is " + parsed.toString());

        return parsed;
    }
    catch (e) {
        log("JSON_LIBRARY: could not retreive contents, socket Exception or Server Timeout");
        return undefined;
    }
}

// Returns the Status Code when GETting the URL
function requestStatusCodeWithGET(requestedURL) {
    try {
        var connection = new java.net.URL(requestedURL).openConnection();
        connection.setDoOutput(false);
        connection.setDoInput(true);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("charset", "utf-8");
        connection.connect();

        var responseCode = connection.getResponseCode();
        return responseCode;
    }
    catch (e) {
        log("JSON_LIBRARY: could not retreive contents, socket Exception or Server Timeout");
        return 500;
    }
}


//
// Script logic starts here
//

// Let's create several instances for various log levels
var SparkInfo = new SparkLog("", "CISCO_SPARK_INCOMING_WEBHOOK_ID"); //
var SparkDebug = new SparkLog("", "CISCO_SPARK_INCOMING_WEBHOOK_ID");

// info level used to get a synthetic sump up of what's happing
function info(logEntry) {
    log("INFO: " + logEntry);
    SparkInfo.log(logEntry);
    // Uncomment if you opt to go for 2 distinct Spark Rooms for DEBUG and INFO log levels
    SparkDebug.log(logEntry);
}

// debug level used to get detail informations
function debug(logEntry) {
    log("DEBUG: " + logEntry);
    SparkDebug.log(logEntry);
}

// returns true or false
function isEmail(email) {
    // extract from http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// returns an email address if found in the phrase specified
function extractEmail(phrase) {
    if (phrase) {
        var parts = phrase.split(" ");
        for (var i = 0; i < parts.length; i++) {
            if (isEmail(parts[i])) {
                return parts[i];
            }
        }
    }
    return null;
}

function fetchNextActivities() {
    var url = "https://pixelscamp.herokuapp.com/next";
    var response = requestJSONviaGET(url);
    if (response && response instanceof Array) {
        return response;
    }
    return [];
}

// Adds the user with email to the room,
// Returns an HTTP status referenced here: https://developer.ciscospark.com/endpoint-memberships-post.html
function addUserToSupportRoom(email) {
    var client = new SparkClient("YOUR_CISCO_SPARK_API_ACCESS_TOKEN");
    var result = client.createMemberShip("THE_IDENTIFIER_OF_THE_SPARK_ROOM_TO_JOIN", email);
    return result;
}


// Convert time from CET to TZ
// example : convertCET(new Date().getTime())
function convertCET(ref) {
    var offset = 1;
    return new Date(ref + (3600000 * offset));
}

// Returns current time in format HH:MM AM|PM
function timeAtEvent() {
    var meridian = "AM";
    var nowlocally = convertCET(Date.now());
    var hours = nowlocally.getHours();
    if (hours > 12) {
        meridian = "PM";
        hours -= 12;
    }
    return "" + hours + ":" + nowlocally.getMinutes() + " " + meridian;
}

var currentVoice = "Vanessa";

// You may check currentCall features here : https://www.tropo.com/docs/scripting/currentcall
if (currentCall) {
    if (currentCall.network == "SMS") { // SMS
        // Check we received a valid email address
        var input = currentCall.initialText;
        debug("received: " + input + ", from: +" + currentCall.callerID);

        // check email is present,
        var extractedEmail = extractEmail(input);
        if (!extractedEmail) { // send Welcome message
            say("Welcome to the Pixels Camp 2016. Text your email to join the Cisco Spark room, and get support from DevNet mentors.");
            info("sent welcome SMS to : +" + currentCall.callerID);
        }
        else { // register to the Sandbox Room
            var statusCode = addUserToSupportRoom(extractedEmail);
            switch (statusCode) {
                case 200:
                    // [TODO] enhance with a short link: "https://web.ciscospark.com/#/rooms/6a480400-32b6-11e6-a2c1-b1ee3f4465dd"
                    say("Welcome. " + extractedEmail + " is now part of the 'DevNet Support' room. Launch Cisco Spark to meet.");
                    info("" + currentCall.callerID + " added email: " + extractedEmail + " to the Support Room");
                    break;

                case 409:
                    say("You're all set: already a member of the 'DevNet Support' room. Launch Cisco Spark to meet.");
                    info("" + currentCall.callerID + " already added to room with email: " + extractedEmail);

                    break;

                default:
                    say("Sorry but we could not add " + extractedEmail + " to the 'DevNet Support' room.");
                    debug("" + currentCall.callerID + " could not be added to room, status:" + statusCode + " with email: " + extractedEmail);
                    break;
            }
        }
        // End of SMS custom logic
    }
    else { // Voice
        // Speak a welcome message
        debug("incoming call from: " + currentCall.callerID);
        wait(1000);
        say("Welcome to the Pixels Camp 2016. It is now " + timeAtEvent() + " in Lisbon.", {
            voice: currentVoice
        });
        info("spoke the welcome message to: +" + currentCall.callerID);

        // Checking session list
        var listOfActivities = fetchNextActivities();
        debug("retreived " + listOfActivities.length + " activities after: " + timeAtEvent());
        var nbActivities = listOfActivities.length;
        if (nbActivities == 0) {
            say("Sorry, we did not find any upcoming activity. Good bye.", {
                voice: currentVoice
            });
            info("no upcoming sessions for: +" + currentCall.callerID);
            wait(1000);
            hangup();
            throw createError("no upcoming activity, exiting");
        }

        // Pick a maximum of 10 sessions
        var MAX = 10;
        if (nbActivities > MAX) {
            debug("more than " + MAX + " activities after: " + timeAtEvent())
            nbActivities = MAX;
        }

        say("Here are the next 10 activities.", {
            voice: currentVoice
        });
        wait(500);

        // Propose MENU, removed option 0 for now
        var inviteIVR = "Dial One to receive more details by SMS, Two for next activity, and Three for previous activity.";
        var num = 0;
        var safeguard = 0; // to avoid loops on the scripting platform
        while (num < nbActivities && num >= 0) {
            debug("speaking activity number: " + (num+1));

            safeguard++;
            if (safeguard > 50) {
                debug("safeguard activated for: +" + currentCall.callerID);
                hangup();
                throw createError("safeguard activated");
            }

            var currentActivity = listOfActivities[num];
            var event = ask("" +  currentActivity.summary + " this " + currentActivity.beginDay + " at " + currentActivity.beginTime + ". " + inviteIVR, {
            //ask("<speak> " + currentActivity.title + " <break time='300ms'/> this " + currentActivity.day + " <break time='300ms'/> at " + currentActivity.begin + " <break time='300ms'/> by " + currentActivity.speaker + " <break time='500ms'/>" + inviteIVR + "</speak>", {
                    voice: currentVoice,
                    //choices: "1(inscrire), 2(detail), 3(suivant)", recognizer: "fr-fr", mode: 'any', // DTMF + VOICE
                    //choices: "1(One,Suscribe),2(Two,Details),3(Three,Next)", recognizer: "en-us", mode: 'any',
                    choices: "0,1,2,3",
                    mode: 'dtmf', // DTMF only
                    attempts: 1,
                    timeout: 3,
                    bargein: true, // Take action immediately when a Dial Tone is heard
                    onEvent: function(event) {
                        event.onTimeout(function() {
                            debug("choice timeout for user: +" + currentCall.callerID);
                            say("Sorry but I did not receive your answer", {
                                voice: currentVoice
                            });
                        });
                        event.onBadChoice(function() {
                            debug("bad choice for user: +" + currentCall.callerID);
                            say("Sorry I did not understand your answer", {
                                voice: currentVoice
                            });
                        });
                        event.onHangup(function() {
                            debug("user has hanged up +" + currentCall.callerID);
                        });
                    }
                });

            // Take action corresponding to user choice
            if (event.name == 'choice') {
                debug("user: " + currentCall.callerID + " chose " + event.value);
                var selected = parseInt(String(event.value));
                switch (selected) {
                    case 0:
                        debug("0: Infos to join the Spark Room for: +" + currentCall.callerID);

                        say("Text your email to join the 'DevNet' Cisco Spark room. You'll get technical support and discover upcoming activities at PixelsCamp.", {
                            voice: currentVoice
                        });
                        break;

                    case 1:
                        debug("1: Details for activity: " + currentActivity.summary + " for: +" + currentCall.callerID);

                        // Send SMS in a new session
                        var forkedCall = call(currentCall.callerID, {
                            network: "SMS"
                        });
                        forkedCall.value.say("" + currentActivity.beginDay + ", " + currentActivity.beginTime +
                            ": '" + currentActivity.summary +
                            "' at '" + currentActivity.location +
                            "' ");

                        say("Got it. Sending you more details by SMS.", {
                            voice: currentVoice
                        });

                        // Send 2nd SMS
                        forkedCall.value.say("Reply with your email to join the 'DevNet Support' room. See you in the Cisco Spark room says the @CiscoDevNet bot");
                        forkedCall.value.hangup();

                        info("sms sent for: " + currentActivity.summary + " to: +" + currentCall.callerID);

                        // Then move to next session
                        wait(500);
                        if (num == (nbActivities - 1)) {
                            say("Sorry, we do not have any activity after this one", {
                                voice: currentVoice
                            });
                            wait(500);
                        }
                        else {
                            say("Moving to next activity", {
                                voice: currentVoice
                            });
                            wait(500);
                            num++;
                        }
                        break;

                    case 2:
                        debug("2: Next from activity: " + currentActivity.title + " for: +" + currentCall.callerID);
                        if (num == (nbActivities - 1)) {
                            say("Sorry, no more activity after this one", {
                                voice: currentVoice
                            });
                            wait(500);
                        }
                        else {
                            say("Got it, moving forward to next activity", {
                                voice: currentVoice
                            });
                            wait(500);
                            num++;
                        }
                        break;

                    case 3:
                        debug("2: Previous from activity: " + currentActivity.summary + " for: +" + currentCall.callerID);
                        if (num == 0) {
                            say("Sorry we do not have any activity before this one", {
                                voice: currentVoice
                            });
                            wait(500);
                        }
                        else {
                            say("Got it, going back to previous activity", {
                                voice: currentVoice
                            });
                            wait(500);
                            num--;
                        }
                        break;

                    default:
                        debug("unexpected choice from: " + currentCall.callerID);
                        hangup();
                        throw createError("unexpected choice, exiting");
                }
            }

            else { // No choice was made, pick next session
                debug("X: no choice, picking next activity: " + currentActivity.title + " for: +" + currentCall.callerID);
                say("Moving forward to next activity ", {
                    voice: currentVoice
                });
                wait(500);
                num++;
            }
        }

        debug("no more activity for +" + currentCall.callerID);
        say("<speak>thank you for joining the Hackathon. Wish you a great Cisco API challenge <break time='500ms'/> Good bye</speak>", {
            voice: currentVoice
        });
        wait(100);
        hangup();
    }
}
else {
    debug("new Tropo request from API");

    // Checking current time
    var now = new Date(Date.now());

    debug("it is now " + (now.getHours() +1) + " hours and " + now.getMinutes() + " minutes in Lisbon");

    debug("CET time is: " + convertCET(Date.now()).toLocaleString());

    debug("time in Lisbon: " + timeAtEvent());

    // Checking session list
    var listOfActivities = fetchNextActivities();
    debug("retreived: " + listOfActivities.length + " upcoming activities");

    if (listOfActivities & listOfActivities.length > 0) {
        debug("Showing one upcoming activity: " + listOfActivities[0]);
    }
}