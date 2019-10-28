/** CONSTANTS **/

const body = document.querySelector("body");

/** VARIABLES **/

var scroll_pos = 0;

document.addEventListener("scroll", function() {
  scroll_pos = window.pageYOffset || document.documentElement.scrollTop;
}, false);

update();

/** MAIN LOOP **/

function update() {
  // Landing scroll
  if (scroll_pos > 0) {
    body.classList.remove("landing");
  } else {
    body.classList.add("landing");
  }

  requestAnimationFrame(update);
}
