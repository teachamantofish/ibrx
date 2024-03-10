<?php

header('Access-Control-Allow-Origin: *');

function callFirstUrl($name) {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'https://sheets.googleapis.com/v4/spreadsheets/1ZhgPgVwcgnBc5cN3lYEupwDCFNSHpcI6-RUwQdWKN60/values/' . $name . '?key=AIzaSyDhOS3VJZ66Utl0lnHbSK8gH0BXz-wxRoU');
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($curl);
    curl_close($curl);
    return $response;
}

function updatesFunction() {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'https://sheets.googleapis.com/v4/spreadsheets/1wt6MDMmIPTgfep8-BU8ywGW-I6DW2R5EmXtGsM0CsXg/values/updates?key=AIzaSyDhOS3VJZ66Utl0lnHbSK8gH0BXz-wxRoU');
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($curl);
    curl_close($curl);
    return $response;
}

function callThirdUrl() {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'your_third_url_here');
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($curl);
    curl_close($curl);
    return $response;
}

$name = $_GET['name'];
$response1 = callFirstUrl($name);
$response2 = updatesFunction();
$response3 = callThirdUrl();

echo $response1;
echo $response2;
echo $response3;