import * as webdriver from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import {path} from 'chromedriver';
import {sprintf} from 'sprintf-js';
import * as jsonfile from 'jsonfile';
import * as fs from 'fs';

const username = ""; // Enter your kattis username here
const password = ""; // Enter your kattis account password here
// you need to compile and run the script 3 time (lazy developer). with integers
// in order 1, then 2, and then 3. 
const STEP: number = 1; // set this number in range [1,3]. 

class Problem{
  public pid: string;
  public title: string;
  public lang: string;
  public solution: string;
}

function main() {
  let driver = getDriver();
  login(driver);
  let problems: Problem[];

  if(STEP == 1){
    problems = [];
    for(let i=0;i<2;i++){
      problemsList(driver, i, problems);
    }
  }
  else {
    problems = require('../problems');
    if(STEP == 2){
      for(let pid of problems) {
        getProblemMetaData(driver, pid);
      }
    }
    else if(STEP == 3){
      for(let pid of problems) {
        getProblemSubmission(driver, pid);
      }
    }
    else{
      console.log("ERROR: step out of range");
    }
  }

  driver.get("https://open.kattis.com/").then(function(){
    if(STEP<=2){
      jsonfile.writeFile('problems.json', problems, function(err){
        console.log(err);
      });
    }
  });
  driver.quit();
}

function login(driver) {
  driver.get("https://open.kattis.com/login/email");
  input_textBox(driver, {id: 'user_input'}, username);
  input_textBox(driver, {id: 'password_input'}, password);
  driver.findElement({css: 'input[type="submit"]'}).click();
}

function problemsList(driver, pageNum, problems: Problem[]) {
  driver.get(sprintf(
    'https://open.kattis.com/problems?page=%d&show_solved=on&show_tried=off&show_untried=off',
    pageNum
  ));

  driver.findElement({css: 'tbody'}).findElements({css: 'tr'}).then(function(rows) {
    for(let row of rows){
      row.findElement({css: 'td.name_column > a'}).then(function(a){
        a.getAttribute('href').then(function(link){
          let p = new Problem();
          p.pid = link.substr(33);
          problems.push(p);
        });
      });
    }
  });
}

function getProblemMetaData(driver, p: Problem){
  driver.get('https://open.kattis.com/problems/' + p.pid);
  driver.findElement({css: 'h1'}).getText().then(function(txt){
    p.title = txt;
  });

  driver.get(sprintf('https://open.kattis.com/users/%s/submissions/%s',
    username.toLowerCase(), p.pid
  ));
  driver.findElement({css: 'table.table > tbody'}).findElements({css: 'tr'}).then(function(rows) {
    let fn = function(i){
      rows[i].findElements({css: 'td'}).then(function(cells) {
        cells[3].getText().then(function(submissionResult){
          if(submissionResult!='Accepted'){
            if(i+1<rows.length) fn(i+1);
          }
          else{
            cells[0].getText().then(function(txt){
              p.solution=txt;
            });
            cells[5].getText().then(function(txt){
              p.lang=txt;
            });
          }
        });
      });
    }
    if(rows.length>0) fn(0);
  });
}

function getProblemSubmission(driver, p: Problem){
  driver.get('https://open.kattis.com/submissions/' + p.solution);
  driver.findElement({className: 'source-highlight'}).then(function(div){
    div.getText().then(function(txt){
      let name = p.pid + ' - ' + p.title;
      if(p.lang=='C++') name+='.cpp';
      else if(p.lang=='Python 2') name+='.py2';
      else if(p.lang=='Java') name += '.java';
      else console.log("error with language for problem:\n", p);
      fs.writeFile('kattis_solutions/'+name, txt, function(err) {
        console.log("Error with: ", p);
        console.log(err);
      });
    });
  });
}

function input_textBox(driver, selector, value) {
  let elm = driver.findElement(selector);
  elm.clear();
  elm.sendKeys(value);
}

function getDriver() {
  let options = new chrome.Options();
  if (process.platform == 'linux') {
    options.addArguments('headless');
    options.addArguments('disable-gpu');
  }

  let service = new chrome.ServiceBuilder(path).build();
  chrome.setDefaultService(service);

  return new webdriver.Builder().forBrowser('chrome')
    .withCapabilities(options.toCapabilities()).build();
}

main();