let teamData = {
	"event" : "ZRL 3.3",
	"course" : "Innsbruckring",
	"team": [
		{
			"name" : "Richard Badger-Taylor",
			"zid" : 3478319
		},
		{
			"name" : "Jason Blackbourn",
			"zid" : 1354412
		},
		{
			"name" : "Steve Knowles",
			"zid" : 2570152
		},
		{
			"name" : "Gaz Jones",
			"zid" : 408281
		},
		{
			"name" : "James Grant",
			"zid" : 1331113
		}

	]
}

function toHoursAndMinutes(totalSeconds) {
  const totalMinutes = Math.floor(totalSeconds / 60);

  const seconds = Math.abs(Math.floor(totalSeconds % 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { h: hours, m: minutes, s: seconds };
}

$(function() {


	$('#rider-template').hide();
$('#course-name .scrollbox').html(teamData.course);

async function setupSelf(){
	const response = await fetch("../../../../api/athlete/stats/v1/self");
	let userData = await response.json();   	
	refreshStats(userData);
	console.log(userData);
}

function refreshStats(athlete) {
	let riderTime = toHoursAndMinutes(athlete.stats.elapsedTime);
	$('#timer .infolabel').html(
		riderTime.h + ":" + riderTime.m.toString().padStart(2,0) + ":" + riderTime.s.toString().padStart(2,0)
	);
	$('#current-power').html(athlete.state.power.toString() + "W - FTP: " + athlete.athlete.ftp);
	//calculate zone from FTP
	//=(B12/A12 * 100 - 45) / 15 * 16.6
	let zonePCT = Math.floor(
		(athlete.state.power / athlete.athlete.ftp * 100 - 45) / 15 * (100/6)
		);
	if (zonePCT < 0) zonePCT = 5;
	if (zonePCT > 100) zonePCT = 100;
	$('#current-hr').html(athlete.state.heartrate);
	$('#powerzone .track').animate({'width': zonePCT + '%'}, 900);

}


async function populateLeaderboard(){
	//manually set IDs
	//or get random nearby IDs 
	// const response = await fetch('../../../../api/nearby/v1');
	// let neighborData = await response.json();
	// teamData.raw = neighborData.slice(0,6);
	// for (i in teamData.raw) {
	// 	teamData.team[i].zid = teamData.raw[i].athleteId;
	//   teamData.team[i].name = teamData.raw[i].athlete.fullname;
	//   console.log(teamData.raw[i]);

	// }


	for (i in teamData.team) {
		let rider = teamData.team[i];
		let riderLine = $("<li data-zid='"+rider.zid+"'><span class='rider-name'>"+rider.name+
			"</span> <span class='monotime'>--:--</span></li>");
		$('#roster ul').append(riderLine);

	}

}

function updateDisplay(){

	let riderLines = [];

	for (i in teamData.team) {
			
			let rider = teamData.team[i];
			fetch('../../../../api/athlete/stats/v1/' + rider.zid)
			    .then((response) => response.json())
			    .then((json) => {
			    	let riderLine = $("li[data-zid='"+rider.zid+"']").first();
			    	let gap = toHoursAndMinutes(json.gap);
			    	riderLine.children('.monotime').html(gap.m + ":" + gap.s.toString().padStart(2,0));
			    	
					riderLine.children('.rider-name').html(rider.name);
					console.log(json);
			    });
			

	}

					
}

populateLeaderboard();

setInterval(setupSelf, 1000);
//setInterval(updateDisplay, 1000);
//updateDisplay();	
});


