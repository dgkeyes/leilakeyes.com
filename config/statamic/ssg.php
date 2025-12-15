<?php

return [

    'base_url' => config('app.url'),

    'destination' => storage_path('app/static'),

    'copy' => [
        public_path('build') => 'build',
        public_path('img') => 'img',
    ],

    'symlinks' => [
        //
    ],

    'urls' => [
        //
    ],

    'exclude' => [
        //
    ],

    'pagination_route' => '{url}/{page_name}/{page_number}',

    'glide' => [
        'directory' => 'img',
        'override' => true,
    ],

    'failures' => 'errors',

];
