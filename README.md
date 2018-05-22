### TravelPresenter
The Goal of this project is to create an easy to use web based application, that enables users to create and
share custom presentations of their travels, utilizing geotags of images and a rendered representation on
a map for the travelled route.
####Prerequisites 
* some form of mongoDB
* [node.js](https://nodejs.org/en/)
* the [npm package manager ](https://www.npmjs.com/)




#### Setup 
If you have docker installed, the mongoDB server can be easily started by running:

```
docker run --name mongo-travelpresenter -p 27017:27017 mongo   
docker start mongo-travelpresenter
```

To run the project locally, simply run ```npm install``` in 
 the root directory, and afterwards start the app with ```node app.js```  

You will also need to provide an environment file (.env) in the root folder consisting of the following variables:
 
 ````
MONGODB_URI=mongodb://localhost:27017/test
MONGOLAB_URI=mongodb://localhost:27017/test

SESSION_SECRET=<your random session secret>

GOOGLE_ID=<your id>.apps.googleusercontent.com
GOOGLE_SECRET=<your google secret from the api console>
 ````



#### Architecture
The Project is structured according to the MVC Pattern,
where the Components Model, View and Controller
are seperated from each other to improve separation of 
concerns and reusability.

