<?php

/**
 * You will need to add your StatsD host and port near the bottom
 *
 * EXAMPLE USAGE USING JQUERY
 *
 * $K.get("http://pathToThisResource.php", {
 *   "bucket" : "app.user-click",
 *   "action" : "increment"
 * });
 *
 **/

/**
 * Get input from ajax call
 **/
$bucket = filter_input(INPUT_GET, "bucket", FILTER_SANITIZE_STRING);
$action = filter_input(INPUT_GET, "action", FILTER_SANITIZE_STRING);
$duration = filter_input(INPUT_GET, "duration", FILTER_SANITIZE_NUMBER_INT);
$sampleRate = filter_input(INPUT_GET, "samplerate", FILTER_SANITIZE_NUMBER_INT);

/**
 * Direct input to corresponding StatsD call.
 **/
if ($bucket && $action) {
	if ($action == "increment") {
		StatsD::increment($bucket);
	} elseif ($action == "decrement") {
		StatsD::decrement($bucket);
	} elseif ($action == "timing") {
		if ($duration) {
			if ($sampleRate) {
				StatsD::timing($bucket, $duration, $sampleRate);
			} else {
				StatsD::timing($bucket, $duration);
			}
		}
	}
}

class StatsD {
    public static function timing($stat, $time, $sampleRate=1) {
        StatsD::send(array($stat => "$time|ms"), $sampleRate);
    }
    public static function increment($stats, $sampleRate=1) {
        StatsD::updateStats($stats, 1, $sampleRate);
    }
    public static function decrement($stats, $sampleRate=1) {
        StatsD::updateStats($stats, -1, $sampleRate);
    }
    public static function updateStats($stats, $delta=1, $sampleRate=1) {
        if (!is_array($stats)) { $stats = array($stats); }
        $data = array();
        foreach($stats as $stat) {
            $data[$stat] = "$delta|c";
        }
        StatsD::send($data, $sampleRate);
    }
    public static function send($data, $sampleRate=1) {
        $sampledData = array();
        if ($sampleRate < 1) {
            foreach ($data as $stat => $value) {
                if ((mt_rand() / mt_getrandmax()) <= $sampleRate) {
                    $sampledData[$stat] = "$value|@$sampleRate";
                }
            }
        } else {
            $sampledData = $data;
        }
        if (empty($sampledData)) { return; }
		try {
            $host = [your graphite host here];
            $port = [your graphite port here 8125?];
            $fp = fsockopen("udp://$host", $port, $errno, $errstr);
            if (! $fp) { return; }
            foreach ($sampledData as $stat => $value) {
                fwrite($fp, "$stat:$value");
            }
            fclose($fp);
        } catch (Exception $e) { var_dump($e);}
    }
}