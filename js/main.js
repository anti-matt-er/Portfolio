/** CONSTANTS **/

const body = document.querySelector("body");
const container = document.querySelector(".background-pattern");
const sections = document.querySelectorAll("section");
const odd_sections = document.querySelectorAll("section:nth-child(odd) .content");
const even_sections = document.querySelectorAll("section:nth-child(even) .content");
const section_nav = document.querySelector(".section-nav");
const section_nav_buttons = document.querySelectorAll(".section-nav a");
const contact_form = document.querySelector(".contact-form");
const contact_button = document.querySelectorAll(".contact");
const contact_close = document.querySelector(".contact-form .close");
const contact_tabbables = document.querySelectorAll(".contact-form input, .contact-form textarea, .contact-form button");
const parallax_divider = 8;
const parallax_lerp_divider = 16;
const parallax_lerp = 1 / parallax_lerp_divider;
const section_nav_scroll_threshold = 100;
const default_section_nav_desc = section_nav.getAttribute("data-description");
const no_motion_query = window.matchMedia('(prefers-reduced-motion: reduce)');

/** VARIABLES **/

var scroll_pos = 0;
var mouse_pos = {
  x: 0,
  y: 0
}
var contact_open = false;
var blank_section_nav = false;
var using_tilt = false;
var landing = true;
var no_motion = false;

/** INIT **/

window.scroll({
  top: 0,
});

no_motion_query.addEventListener('change', function() {
  no_motion = true;
});

Array.prototype.forEach.call(odd_sections, function(el, i) {
  el.setAttribute("data-aos", "fade-left");
});

Array.prototype.forEach.call(even_sections, function(el, i) {
  el.setAttribute("data-aos", "fade-right");
});

Array.prototype.forEach.call(section_nav_buttons, function(el, i) {
  el.addEventListener("click", function(e) {
    var anchor = document.querySelector(el.getAttribute("href"));
    var anchor_pos = anchor.offsetTop;
    window.scroll({
      top: anchor_pos,
      left: 0,
      behavior: 'smooth'
    });
    e.preventDefault();
  });
  el.addEventListener("mouseout", function(e) {
    section_nav.setAttribute("data-description", blank_section_nav ? "" : default_section_nav_desc);
  });
  el.addEventListener("mouseover", function(e) {
    section_nav.setAttribute("data-description", el.getAttribute("title"));
  });
});

container.style.backgroundPositionX = "0px";
container.style.backgroundPositionY = "0px";

document.addEventListener("scroll", function () {
  scroll_pos = window.pageYOffset || document.documentElement.scrollTop;
  requestAnimationFrame(update);
}, false);

document.addEventListener("mousemove", function (e) {
  mouse_pos.x = e.clientX;
  mouse_pos.y = e.clientY;
  using_tilt = false;
});

window.addEventListener("devicemotion", function (e) {
  mouse_pos.x = e.accelerationIncludingGravity.x * 100;
  mouse_pos.y = e.accelerationIncludingGravity.y * 100;
  using_tilt = true;
}, true);

Array.prototype.forEach.call(contact_button, function(el, i) {
  el.addEventListener("click", function (e) {
    contact_open = true;
    contact_form.classList.remove("modal-closed");
    contact_form.focus();
    contact_form.setAttribute("tabindex", "0");
    Array.prototype.forEach.call(contact_tabbables, function(c_el, c_i) {
      c_el.setAttribute("tabindex", "0");
    });
    requestAnimationFrame(update);
  });
});

contact_close.addEventListener("click", function (e) {
  contact_open = false;
  contact_form.classList.add("modal-closed");
  contact_form.setAttribute("tabindex", "-1");
  Array.prototype.forEach.call(contact_tabbables, function(c_el, c_i) {
    c_el.setAttribute("tabindex", "-1");
  });
  contact_button[0].focus();
  requestAnimationFrame(update);
});

update_pattern();

/** MAIN LOOP **/

function update() {
  // Force AOS update
  AOS.refresh();

  // Fade out section nav
  Array.prototype.forEach.call(sections, function (el, i) {
    var button = document.querySelector(".section-nav a[href=\"#" + el.getAttribute("id") + "\"]");
    blank_section_nav = false;
    if (section_nav.getAttribute("data-description") == "") {
      section_nav.setAttribute("data-description", default_section_nav_desc);
    }
    if (scroll_pos > el.offsetTop - section_nav_scroll_threshold) {
      button.classList.add("visited");
      if (i == sections.length - 1) {
        section_nav.setAttribute("data-description", "");
        blank_section_nav = true;
      }
    } else{
      button.classList.remove("visited");
    }
  });

  // Landing scroll
  if (scroll_pos > 0 || contact_open) {
    if (landing) {
      body.classList.remove("landing");
      landing = false;
    }
  } else {
    if (!landing) {
      body.classList.add("landing");
      landing = true;
    }
  }
}

/** FUNCTIONS **/

function update_pattern() {
  if (!no_motion)
  {
    var currentX = parseFloat(container.style.backgroundPositionX);
    var currentY = parseFloat(container.style.backgroundPositionY);
    var mouse_y = mouse_pos.y;
    if (!using_tilt)
    {
       mouse_y = -(mouse_y + scroll_pos);
    }
    container.style.backgroundPositionX = lerp(currentX, -mouse_pos.x / parallax_divider, parallax_lerp) + "px";
    container.style.backgroundPositionY = lerp(currentY, mouse_y / parallax_divider, parallax_lerp) + "px";
    requestAnimationFrame(update_pattern);
  }
}

function lerp(start, end, amt) {
  return (1-amt)*start+amt*end;
}
