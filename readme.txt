=== Image Projector ===
Contributors: wpgloe
Tags: photography, photo, image, viewer, slideshow, simple, image in post
Tested up to: 4.2.2
Requires at least: 4.0
Stable tag: 1.3
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

A swift viewer and slideshow for the first image in published posts. Good for photographers. No gallery required. 


== Description ==

This plugin provides a viewer and slideshow for the first image in published posts. No gallery required. Speed and simplicity has been priority number one.

Convenient for those who runs photography-related websites with one photo per post and does not want the hassle with setting up and maintaining separate galleries - and do not want to load a new page for each photo.

See it alive [here](http://www.lystfotograf.net/archives/1631 "http://www.lystfotograf.net").

When activated from a single-post page, it allows you to navigate through the first image in all published posts.

When activated from an archive page (tag results, search results etc.), it limits the images to the first image attached to the posts resulting from the query.

Setup it simple, no action is required except of installing the plugin. It does not come with an overwhelming number of customisation options, but there are a few. The styles can also be customised by editing the stylesheet that comes with the plugin.

Functionality is tested with WordPress 4.2.1.  Most likely it will work with other recent versions as well. To be on the conservative side, 'Requires at least' has been set to 4.0

Plugin uses [Desandro's imagesloaded](https://github.com/desandro/imagesloaded "Go to imagesloaded on github") for smooth appearance. This is included in the plugin package, you don't need to install it separately.

== Installation ==

1. Upload the plugin to your WordPress plugin directory or install it by using the "Add Plugin" function of WordPress
2. Activate the plugin at the plugin administration page
3. Visit the plugin settings page and modify as desired

== Frequently Asked Questions ==

= I don't see any buttons - what do I do? =
Click (tap) in the right part of the window to go to the next image, vice versa to go to previous image. 
To show the menu, click nearer to the middle part of the window or around the bottom of the window.

For those who are blessed with a keyboard, this can be used: **right arrow/left arrow** - next and previous, **up arrow/down arrow** - toggle menu, **A** - toggle autoplay, **V** or  **Y** - switch style, **X** - exit, **L** - last image.

= Can I choose which pages to use it in? =
Yes, this can be specified in the plugin settings page.

= Can I modify the style? =
Yes, to some extent. Please have a look into the plugin settings page and the stylesheet located in the plugin directory.

If you have any suggestions to enhacements or modifications, feedback is very much appreciated!

= Is it responsive and tablet friendly? =
Yes, I think so. It is not particularly aimed at touch-enabled devices, but tapping works of course well...

= Does it work in all versions of all browsers? =
Most likely not, but it seem to work as expected in 'all modern browsers'.


= Does it work with Infinite Scroll or other lazy-loaders? =
Yes, however, for [Infinite Scroll](http://www.infinite-scroll.com "Infinite Scroll") you have to add some lines to your setup if you want to be able to activate the viewer by clicking the images not initially loaded:

	$container.infinitescroll({
		...
		},
			function( newElements ) {
			var newElems = jQuery( newElements );
			...
			...
			newElems.find('img:first').click(function(e) {
				WPIV.start(jQuery(this));
				});
			}
		);

In other words: Bind WPIV.start(this) as a handler to the click event for the new images as they are loaded.

Other lazy-loading implementations may have a different way to set it up, please consult the documentation.

== Screenshots ==

1. Full window, this is how it looks when the menu is turned on
2. User-defined border width and color
3. Image on square background
4. Image on square background with another color
5. Full window (as full as possible, aspect ratio will always be kept)
6. Settings page
== Changelog ==

= 1.0 =
* Launch

