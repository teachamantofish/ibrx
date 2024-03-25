<!DOCTYPE html>
<html>
<head>
  <meta name="robots" content="noindex, nofollow">

  <link href="../css/time/visegrad.min.css" rel="stylesheet" type="text/css" />
  <link href="../css/bencustom1.css" rel="stylesheet" type="text/css" />
  <link href="../css/radiobuttons.css" rel="stylesheet" type="text/css" />
  <link href="../css/buttons.css" rel="stylesheet" type="text/css" />

  <link rel="stylesheet" href="../js/table/two.min.css" />
<link rel="stylesheet" href="../css/table/bootstrap.min.css" />
<script src="../js/table/one.js"></script>

  

</head>
<body>


<div class="navbar">
    <a href="javascript:void(0);" class="icon" onmouseover="openNav()" onmouseout="closeNav()">&#9776;</a>
</div>

<div id="mySidenav" class="sidenav" onmouseover="openNav()" onmouseout="closeNav()">
    <a href="#">Home</a>
    <a href="#">Pipeline Viewer</a>
    <a href="#">Partner Viewer</a>
    <a href="#">Squeeze Alert</a>
</div>

<script>
function openNav() {
    document.getElementById("mySidenav").style.width = "150px";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}
</script>



<section class="widget" id="update" >
  <style>
    td,
    th {
        color: black;
        padding: 1px;
        font-size: 9pt;
    }

    .dt-table>tbody>tr>td,
    .dt-table>tbody>tr>th,
    .dt-table>tfoot>tr>td,
    .dt-table>tfoot>tr>th,
    .dt-table>thead>tr>td,
    .dt-table>thead>tr>th {
        vertical-align: top;
        padding: 4px 10px;
        white-space: break-spaces;
        word-break: keep-all;
    }

    .dt-wrapper {
        margin: 2em;
    }

    a:link,
    a:visited,
    a:hover,
    a:active {
        color: rgb(33, 21, 209);
        text-decoration: none;
    }
</style>
  <table id="ibrxdata" class="table table-bordered table-striped"></table>
  <script>
      var table = document.getElementById('ibrxdata');
      var thead = document.createElement('thead');
      var tbody = document.createElement('tbody');
      table.appendChild(thead);
      table.appendChild(tbody);
      fetch('get-clinicialgovdata.php').then(response => response.json()).then(data => {
          data.values.forEach(function (item, index) {
              var row = document.createElement('tr');
              if (index == 0) {
                  for (var i = 0; i < item.length; i++) {
                      var cell = document.createElement('th');
                      cell.textContent = item[i];
                      row.appendChild(cell);
                  }
                  thead.appendChild(row);
              } else {
                  for (var i = 0; i < item.length; i++) {
                      var cell = document.createElement('td');
                      cell.textContent = item[i];
                      row.appendChild(cell);
                  }
                  tbody.appendChild(row);
              }
          });
          new JSTable('#ibrxdata', {
              perPage: 1000
          });
      });           
  </script>
</section>

</body>
</html> 