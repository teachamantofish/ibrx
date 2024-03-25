<?php

header('Access-Control-Allow-Origin: *');
$name = $_GET['name'];
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, 'https://sheets.googleapis.com/v4/spreadsheets/1ZhgPgVwcgnBc5cN3lYEupwDCFNSHpcI6-RUwQdWKN60/values/' . $name . '?key=AIzaSyDhOS3VJZ66Utl0lnHbSK8gH0BXz-wxRoU');
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($curl);
curl_close($curl);
echo $response;