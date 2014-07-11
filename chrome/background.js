console.group("Installing...");

chrome.app.runtime.onLaunched.addListener(function() {
                                          
                                          console.group("Launching...");
                                          
                                          chrome.app.window.create("display.html", {
                                                                   id: "mainwin",
                                                                   bounds: {
                                                                        width: 1000,
                                                                        height: 600
                                                                        }
                                                                   });
                                          
                                          console.log("Launched.");
                                          console.groupEnd();
                                          
                                          });

console.log("Installed.");
console.groupEnd();
