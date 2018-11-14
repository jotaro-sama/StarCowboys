# StarCowboys
An old school shoot 'em up game meant as a WebGL/HTML5 tech demo. The gameplay was inspired by the arcade classics of the 70s and 80s like Space Invaders or Galaga. 

The spaceship uses [three.js](https://github.com/mrdoob/three.js/)'s `MeshStandardMaterial` in order to show off some of the graphical capabilities of physically based rendering.

Collisions are done with the bounding boxes technique, a simple but very fast collisions detection algorithm whose [three.js implementation tutorial page on Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js) I contributed to, updating both the article and the code examples to the newest version of the three.js library. Feel free to learn from there how to implement it in your three.js game!

The game can be played from [the website](https://jotaro-sama.github.io/StarCowboys/), but it's recommended to download it for faster loading times.
