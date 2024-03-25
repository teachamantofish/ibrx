<?php

header('Access-Control-Allow-Origin: *');
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, 'https://sheets.googleapis.com/v4/spreadsheets/1wt6MDMmIPTgfep8-BU8ywGW-I6DW2R5EmXtGsM0CsXg/values/updates?key=AIzaSyDhOS3VJZ66Utl0lnHbSK8gH0BXz-wxRoU');
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($curl);
curl_close($curl);
echo $response;