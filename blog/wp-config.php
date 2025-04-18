<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the website, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/documentation/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'i5597256_iy2k1' );

/** Database username */
define( 'DB_USER', 'i5597256_iy2k1' );

/** Database password */
define( 'DB_PASSWORD', 'X.1icyiC3v2PQKGewAK41' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         't4mvft6UJCOQewhz34YNvsPLxCrqJRJ4wVNV33sqi7sGuGSCbpYroc8pO7Ls7JL6');
define('SECURE_AUTH_KEY',  'L1ThxUrBnmnDFz7k9oyFTpVK5LBAPsvti0e3Vzigp5ELEH6BMFkOHqjAduzGGOWz');
define('LOGGED_IN_KEY',    'eFX6XuFZffZ5WjsuIk9zbBw1RoDpWMT1De9Sfx6rpr129Oe4Aw2gKxioyf0GFUZI');
define('NONCE_KEY',        'X2Mm03x3Z1M7y0YOLFEbTmT2nVgxNTf5q9vb8LQUNzyfXlGNu1remkXvSIGHEOz2');
define('AUTH_SALT',        'PB7GIJSL31r2AxrWH0fWzKnFMrFDpmEPNwYOcJX1Aewm87lCKyep3DqsTm84yZdN');
define('SECURE_AUTH_SALT', 'U9oNmQjRY1xQALMJGCvssxV0GKQos6d9mqOphSe0Z2ZbBQfJZjGBG6RNwCETqpd8');
define('LOGGED_IN_SALT',   'ow735rRr0h6nMh5wXvx0eRGR8tVvVUW6jxbeacXUBZG90Ykb5VbuxhUjRha07RPa');
define('NONCE_SALT',       'MsQE1TyTPExo3CgD5Lfj7jStWqZAfp13iTvmX0oE0bppefCXbawQFNkBqi9VmIRb');

/**
 * Other customizations.
 */
define('WP_TEMP_DIR',dirname(__FILE__).'/wp-content/uploads');


/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'bv5h_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/documentation/article/debugging-in-wordpress/
 */
define( 'WP_DEBUG', false );

/* Add any custom values between this line and the "stop editing" line. */



/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
