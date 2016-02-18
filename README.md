# Présentation de CHROMEia

CHROMEia est une extension Chrome (de type Apps) pour [PosIA](https://github.com/ARCHIPELIA/archipelia/tree/master/caisse), permettant de gérer les imprimantes tickets de marque Epson.

ID apps Google : **lbblbfcppilomhjabkihbffkplmfgagc**

**Liens utiles :**
* Google dashboard : https://chrome.google.com/webstore/developer/dashboard/
* Panneau de configuration de CHROMEia : https://chrome.google.com/webstore/developer/edit/lbblbfcppilomhjabkihbffkplmfgagc
![image](https://cloud.githubusercontent.com/assets/9865837/13105023/10b54d38-d561-11e5-813b-2649b39e147d.png)
* Lien de téléchargement de CHROMEia : https://chrome.google.com/webstore/detail/chromeia/lbblbfcppilomhjabkihbffkplmfgagc
* Console pour ajouter des URL de téléchargement privées : https://www.google.com/webmasters/tools/home?hl=fr&authuser=0
* Guide de développement d'une Apps Chrome : https://developer.chrome.com/apps/about_apps
* API Chrome Apps : https://developer.chrome.com/apps/api_index

# Mise à jour de CHROMEia

**Toujours passer par une Pull Resquest.**

Suivre les instructions suivantes :

1.  Incrémenter le numéro de version dans le [manifest.json](https://github.com/ARCHIPELIA/chromeia/blob/master/manifest.json)
2.  Créer un ZIP incluant l'ensemble des sources de l'extensions en ignorant les fichiers et répertoires :
	* répertoire **/dist**
	* fichier **README.md**
	* fichiers et répertoire GIT : **.git**, **.gitattributes**, **.gitignore**
	* fichiers et répertoire projets : **Netbeans**, **PHPstorm**
	* autre fichier ne faisant pas parti des sources de l'extension...
3. Déplacer le ZIP dans le repertoire **/dist**
4. Clôturer et merger la PR sur master
5. Tagger master avec le numéro de version du manifest.json
6. Uploader le ZIP dans le [panneau de configuration](https://chrome.google.com/webstore/developer/edit/lbblbfcppilomhjabkihbffkplmfgagc) de CHROMEia
7. Valider la publication des modifications

La mise à jour sera automatiquement installée sur les postes clients.


![Image CHROMEia](https://cloud.githubusercontent.com/assets/9865837/13051059/7a3cbb76-d3f7-11e5-8267-3c2eaab5bcf3.png)
