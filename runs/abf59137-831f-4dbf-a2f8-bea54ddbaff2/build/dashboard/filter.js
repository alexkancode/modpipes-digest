// Counts the cards the filters leave visible. The page works without this file.
(function () {
  var shown = document.getElementById('shown');
  var cards = document.querySelectorAll('.card');
  function update() {
    var n = 0;
    for (var i = 0; i < cards.length; i++) if (getComputedStyle(cards[i]).display !== 'none') n++;
    shown.textContent = n === cards.length ? cards.length + ' shown' : n + ' of ' + cards.length + ' shown';
  }
  document.querySelectorAll('.filters input').forEach(function (b) { b.addEventListener('change', update); });
  update();
})();
