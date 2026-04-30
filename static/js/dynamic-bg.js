/**
 * dynamic-bg.js — v2.5
 * Homepage     : Curated Picsum IDs — rotates daily, same image all day
 * Posts        : Picsum seed-based image — same photo every visit per post (#hero-area)
 * Post listing : Picsum seed-based thumbnails (img.card-img-top) per post slug
 * Tag pages    : Same thumbnail logic — fires on kind-term (e.g. /tags/powershell/)
 *                and kind-taxonomy (e.g. /tags/)
 *
 * Picsum URL formats used:
 *   list of images https://picsum.photos/images ( this is where to get images ID's for the homepage )
 *   Curated : https://picsum.photos/id/{ID}/1920/1080
 *   Seeded  : https://picsum.photos/seed/{slug}/1920/1080
 */
(function () {
  'use strict';

  var cfg = window.VBBlogConfig;
  if (!cfg) return;

  var PICSUM = 'https://picsum.photos';

  /* ── Preload image then swap background — avoids a jarring flash ─────── */
  function applyBg(el, url) {
    var img = new Image();
    img.onload = function () {
      el.style.backgroundImage    = 'url(' + url + ')';
      el.style.backgroundSize     = 'cover';
      el.style.backgroundPosition = 'center';
    };
    img.onerror = function () {
      console.warn('[dynamic-bg] image failed to load:', url);
    };
    img.src = url;
  }

  /* ── Extract the last path segment as a slug ─────────────────────────── */
  function getSlug() {
    var path  = window.location.pathname.replace(/\/+$/, '');
    var parts = path.split('/');
    return parts[parts.length - 1] || 'home';
  }

  /* ── Homepage — curated Picsum IDs, rotates daily ───────────────────── */
  if (cfg.isHome) {
    var homeEl = document.getElementById('homePageBackgroundImageDivStyled');
    if (homeEl) {
      var curatedIds = [
        10,   /* dark forest          */
        26,   /* moody mountain       */
        42,   /* dark abstract        */
        64,   /* night cityscape      */
        103,  /* atmospheric nature   */
        110,  /* architectural detail */
        143,  /* misty landscape      */
        177,  /* urban geometry       */
        200,  /* abstract dark        */
        338,  /* dark corridor        */
        381,  /* industrial           */
        447,  /* night architecture   */
        237,  /* Black Dog            */
        249,  /* London Bridge night lights */
        277,  /* Farm Land            */
        301,  /* Autumn               */
        317,  /* Desert Bridge        */
        324,  /* Jungle               */
        353,  /* Forest               */
        393,  /* Dark Sand and hill   */
        443,  /* Winter hill          */
        478,  /* Train track          */
        681,  /* Night sky            */
        704   /* Bamboo forest        */
      ];
      var dayIndex = Math.floor(Math.random() * curatedIds.length);
      var homeUrl  = PICSUM + '/id/' + curatedIds[dayIndex] + '/1920/1080';
      applyBg(homeEl, homeUrl);
    } else {
      console.warn('[dynamic-bg] #homePageBackgroundImageDivStyled not found');
    }
  }

  /* ── Hire page — fixed seed so it always gets the same background ───── */
  if (cfg.isHire) {
    var hireEl = document.getElementById('hero-area');
    if (hireEl) {
      applyBg(hireEl, PICSUM + '/seed/hire-vibhu/1920/1080');
    }
  }

  /* ── Blog post — consistent photo per post, unique across all posts ──── */
  if (cfg.isPost) {
    var postEl = document.getElementById('hero-area');
    if (postEl) {
      var slug    = getSlug();
      var postUrl = PICSUM + '/seed/' + slug + '/1920/1080';
      applyBg(postEl, postUrl);
    } else {
      console.warn('[dynamic-bg] #hero-area not found');
    }
  }

  /* ── Post card thumbnails — listing page (/posts/), tag pages, and homepage recent-posts */
  var body      = document.body.classList;
  var isListing = body.contains('kind-section')   /* /posts/ listing          */
               || body.contains('kind-term')       /* /tags/powershell/ etc.   */
               || body.contains('kind-taxonomy');  /* /tags/ index             */
  if (isListing || cfg.isHome) {
    var cardScope = isListing
      ? document
      : document.getElementById('recent-post-cards');
    if (cardScope) {
      var cards = cardScope.querySelectorAll('img.card-img-top');
      cards.forEach(function (img) {
        var link     = img.closest('a.post-card-link');
        var href     = link ? link.getAttribute('href') : '';
        var cardSlug = href.replace(/\/+$/, '').split('/').pop() || 'post';
        img.src = PICSUM + '/seed/' + cardSlug + '/800/450';
      });
    }
  }

}());
