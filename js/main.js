$(function() {
	function updateRootFontSize() {
		var viewportWidth = Math.min(screen.width, document.documentElement.getBoundingClientRect().width);
		document.documentElement.style.fontSize = viewportWidth / 750 * 32 + 'px';
	}

	window.addEventListener('resize', updateRootFontSize);
	updateRootFontSize();
});

var gameDurationSeconds = 30;
var score = 0;
var spawnTimer = null;
var effectAudioIndex = 0;
var spawnIntervalMs = getRandomInteger(500, 800);
var targetStayMs = getRandomInteger(150, 250);
var rankingStorageKey = 'whackAMoleRankings';

var targetPositions = [{
		left: "2.25rem",
		top: "10.9375rem"
	},
	{
		left: "9.0625rem",
		top: "9.4375rem"
	},
	{
		left: "15.125rem",
		top: "11.625rem"
	},
	{
		left: "2.25rem",
		top: "17.75rem"
	},
	{
		left: "9.1875rem",
		top: "16.3125rem"
	},
	{
		left: "15.125rem",
		top: "18.5rem"
	},
	{
		left: "2.125rem",
		top: "27rem"
	},
	{
		left: "8.875rem",
		top: "25.4375rem"
	},
	{
		left: "15.125rem",
		top: "27.625rem"
	}
];

var targetFramePrefixes = {
	greyWolf: 'grey-wolf',
	littleGrey: 'little-grey'
};

function getRandomInteger(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

function getTargetFramePath(targetType, frameIndex) {
	return 'image/' + targetFramePrefixes[targetType] + '-' + frameIndex + '.png';
}

function setScore(nextScore) {
	score = Math.max(nextScore, 0);
	$(".score-num").text(score);
	renderCurrentRank();
}

function padTimeUnit(value) {
	return value < 10 ? '0' + value : String(value);
}

function formatDateTime(date) {
	return date.getFullYear() + '-' +
		padTimeUnit(date.getMonth() + 1) + '-' +
		padTimeUnit(date.getDate()) + ' ' +
		padTimeUnit(date.getHours()) + ':' +
		padTimeUnit(date.getMinutes()) + ':' +
		padTimeUnit(date.getSeconds());
}

function getRankingRecords() {
	var records = [];

	try {
		records = JSON.parse(localStorage.getItem(rankingStorageKey)) || [];
	} catch (error) {
		records = [];
	}

	return records;
}

function saveRankingRecords(records) {
	localStorage.setItem(rankingStorageKey, JSON.stringify(records));
}

function clearRankingRecords() {
	localStorage.removeItem(rankingStorageKey);
	renderRankingTable();
}

function sortRankingRecords(records) {
	return records.sort(function(firstRecord, secondRecord) {
		if (secondRecord.score !== firstRecord.score) {
			return secondRecord.score - firstRecord.score;
		}

		return secondRecord.timestamp - firstRecord.timestamp;
	});
}

function renderRankingTable() {
	var records = sortRankingRecords(getRankingRecords());
	var rankingRowsHtml = '';

	renderCurrentRank(records);
	renderTopRankingList(records);

	if (records.length === 0) {
		$("#ranking-table-body").html('<tr><td colspan="4" class="empty-ranking-cell">暂无记录</td></tr>');
		return;
	}

	records.forEach(function(record, index) {
		rankingRowsHtml += '<tr>' +
			'<td><span class="ranking-index">' + (index + 1) + '</span></td>' +
			'<td class="ranking-player-id">' + record.playerId + '</td>' +
			'<td class="ranking-score">' + record.score + '</td>' +
			'<td class="ranking-time">' + formatRankingTime(record.time) + '</td>' +
			'</tr>';
	});

	$("#ranking-table-body").html(rankingRowsHtml);
}

function formatRankingTime(timeText) {
	var timeParts = String(timeText).split(' ');

	if (timeParts.length !== 2) {
		return timeText;
	}

	return '<span>' + timeParts[0] + '</span><span>' + timeParts[1] + '</span>';
}

function renderCurrentRank(records) {
	var sortedRecords = records || sortRankingRecords(getRankingRecords());
	var rank = '--';

	if (sortedRecords.length > 0) {
		rank = (sortedRecords.filter(function(record) {
			return record.score > score;
		}).length + 1);
	}

	$(".rank-num").text(rank);
}

function renderTopRankingList(records) {
	var topRankingHtml = '';
	var topRecords = records.slice(0, 3);

	if (topRecords.length === 0) {
		$("#top-ranking-list").html('<li>暂无记录</li>');
		return;
	}

	topRecords.forEach(function(record) {
		topRankingHtml += '<li>' + record.playerId + '：' + record.score + ' 分</li>';
	});

	$("#top-ranking-list").html(topRankingHtml);
}

function createRankingRecord(finalScore) {
	var now = new Date();

	return {
		playerId: String(getRandomInteger(10000, 99999)),
		score: Number(finalScore),
		time: formatDateTime(now),
		timestamp: now.getTime()
	};
}

function addRankingRecord(finalScore) {
	var records = getRankingRecords();

	records.push(createRankingRecord(finalScore));
	records = sortRankingRecords(records);
	saveRankingRecords(records);
	renderRankingTable();
}

function finishGame() {
	var finalScore = score;

	addRankingRecord(finalScore);
	$(".target-image").remove();
	$(".time-num").text(gameDurationSeconds);
	$(".start-box").show();
}

function playEffectAudio(audioName) {
	effectAudioIndex++;

	var audioHtml = '<audio class="effect-audio" id="effect-audio-' + effectAudioIndex +
		'" preload="auto"><source src="audio/' + audioName + '.ogg" type="audio/ogg"><source src="audio/' + audioName +
		'.mp3" type="audio/mpeg"></audio>';

	$("body").append(audioHtml);
	$('#effect-audio-' + effectAudioIndex)[0].play();

	$(".effect-audio").each(function() {
		if (this.paused) {
			this.remove();
		}
	});
}

function startCountdown(secondsRemaining) {
	var countdownTimer = window.setInterval(function() {
		var second = 0;
		var formattedSecond;

		if (secondsRemaining > 0) {
			second = Math.floor(secondsRemaining);
		}

		formattedSecond = second <= 9 ? '0' + second : second;

		$(".time-num").text(formattedSecond);
		secondsRemaining--;

		if (second === 0) {
			clearInterval(countdownTimer);
			clearInterval(spawnTimer);

			setTimeout(function() {
				finishGame();
			}, 500);
		}
	}, 1000);
}

function toggleBackgroundMusic() {
	var $musicButton = $("#music-button");
	var backgroundAudio = $("#game-bg-audio")[0];

	if ($musicButton.hasClass("is-music-on")) {
		$musicButton.removeClass("is-music-on");
		backgroundAudio.pause();
	} else {
		$musicButton.addClass("is-music-on");
		backgroundAudio.play();
	}
}

function startGame() {
	$("#game-bg-audio")[0].play();
	$("#music-button").addClass("is-music-on");
	$(".start-box").hide();

	setScore(0);
	startCountdown(gameDurationSeconds);
	startSpawnLoop();
}

function startSpawnLoop() {
	spawnTimer = setInterval(function() {
		spawnTarget();
	}, spawnIntervalMs);
}

function spawnTarget() {
	var targetImage = document.createElement('img');
	var positionIndex = getRandomInteger(0, targetPositions.length - 1);
	var targetType = getRandomInteger(0, 1) === 1 ? 'greyWolf' : 'littleGrey';
	var frameIndex = 0;
	var clickCount = 0;

	targetImage.className = 'target-image';
	targetImage.src = getTargetFramePath(targetType, frameIndex);
	frameIndex++;
	$(".game-box-bg").append(targetImage);

	targetImage.style.left = targetPositions[positionIndex].left;
	targetImage.style.top = targetPositions[positionIndex].top;

	targetImage.onclick = function() {
		clickCount++;

		if (clickCount > 1) {
			return false;
		}

		frameIndex = 5;

		for (var i = 0; i < 4; i++) {
			frameIndex++;
			targetImage.src = getTargetFramePath(targetType, frameIndex);

			if (frameIndex > 9) {
				frameIndex--;
			}
		}

		if (targetType === 'greyWolf') {
			setScore(score + 10);
			playEffectAudio('second-music');
		} else {
			setScore(score - 10);
			playEffectAudio('no-hit');
		}
	};

	var appearTimer = setInterval(function() {
		targetImage.src = getTargetFramePath(targetType, frameIndex);
		frameIndex++;

		if (frameIndex > 5) {
			clearInterval(appearTimer);

			setTimeout(function() {
				frameIndex = 5;

				var disappearTimer = setInterval(function() {
					targetImage.src = getTargetFramePath(targetType, frameIndex);
					frameIndex--;

					if (frameIndex < 0) {
						clearInterval(disappearTimer);
						targetImage.remove();
					}
				}, 50);
			}, targetStayMs);
		}
	}, 50);
}

$("#music-button").on("click", toggleBackgroundMusic);
$(".start-button").on("click", startGame);
$(".clear-ranking-button").on("click", clearRankingRecords);
renderRankingTable();
