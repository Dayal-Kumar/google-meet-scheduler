require('dotenv').config();
const express = require('express');
const { base64encode, base64decode } = require('nodejs-base64');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];


app.get('/api/schedule-meet', (req, res) => {
    const body = req.body;
    // Example of parameters given in body
    body.summary = 'Summary';
    body.description = 'Description';
    body.location = 'Location';
    body.date1 = '2022-06-15T00:00:00.000Z';
    body.date2 = '2022-06-15T01:00:00.000Z';
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "http://localhost:4000/auth/callback");
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: base64encode(JSON.stringify(body))
    });
    res.redirect(authUrl);
})

app.get('/auth/callback', (req, res) => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "http://localhost:4000/auth/callback");
    oAuth2Client.getToken(req.query.code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        console.log(token);
        oAuth2Client.setCredentials(token);
        scheduleMeet(oAuth2Client, JSON.parse(base64decode(req.query.state)))
            .then(meetUrl => res.send(meetUrl));
    });
})




async function scheduleMeet(oAuth2Client, options){
    const calendar = await google.calendar({ version: 'v3', auth: oAuth2Client })

    const eventList = await calendar.events.list({
        calendarId: 'primary',
        timeMin: options.date1,
        timeMax: options.date2,
        maxResults: 1,
        singleEvents: true,
        orderBy: 'startTime',
    });
    let events = eventList.data.items;
    if (events.length) {
        console.log("you are busy for this time slot !");
        return null;
    }

    const event = {
        summary: options.summary,
        location: options.location,
        description: options.description,
        colorId: 1,
        conferenceData: {
            createRequest: {
                requestId: "zzz",
                conferenceSolutionKey: {
                    type: "hangoutsMeet"
                }
            }
        },
        start: {
            dateTime: options.date1,
            timeZone: 'Asia/Kolkata',
        },
        end: {
            dateTime: options.date2,
            timeZone: 'Asia/Kolkata',
        },
    }

    const result = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: '1',
        resource: event
    })
    console.log(result.data);
    return result.data.hangoutLink;
}

module.exports = app;
