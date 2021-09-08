# App
Options related to the server startup.

## Base
This is the entry point to the main server setup.
* *default*: The main application. This should only be changed/replaced 
             if you want to start from a different kind of class.

## Init
Contains a list of initializer that need to be run when starting the server.
* *default*: The default setup that makes sure the server starts up correctly.
             The ParallelHandler can be used to add custom Initializers.
* *initialize-root*: Makes sure the root container has the necessary resources to function properly.
                     This is only relevant if setup is disabled but root container access is still required.

## Setup
Handles the setup page the first time the server is started.
* *enabled*: Enables the setup page. All requests will be redirected to the page until it is completed.
* *disabled*: Disables the setup page. Root container access will be impossible unless handled by the Init config above.
              Registration and pod creation is still possible if that feature is enabled.
