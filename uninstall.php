<?php

if (!defined('ABSPATH')) {
	exit("No direct access available.");
}
if ( !defined('WP_UNINSTALL_PLUGIN') ) {
    exit();
}

//Remove added options from database
$option = 'wpiv_options';

delete_option( $option );


?>