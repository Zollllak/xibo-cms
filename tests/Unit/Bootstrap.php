<?php
// Isolated configuration tests need translations, but no CMS database or XMDS server.
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
$translations = (new \Gettext\Loader\MoLoader())->loadFile(dirname(__DIR__, 2) . '/locale/en_GB.mo');
\Gettext\TranslatorFunctions::register(\Gettext\Translator::createFromTranslations($translations));
