/**
 * Created by alvaro.vidal.alegria on 2/03/18.
 */
const Sequelize = require('sequelize');

const {models} = require('./model');

const {log, biglog, errorlog, colorize} = require("./out");

exports.helpCmd = (socket, rl) => {
    log(socket, "Comandos");
    log(socket, "   h|help - Muestra esta ayuda.");
    log(socket, "   list - Lista de los quizzes existentes.");
    log(socket, "   show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log(socket, "   add - Añadir un nuevo quiz interactivamente.");
    log(socket, "   delete <id> - Borrar el quiz indicado.");
    log(socket, "   edit <id> - Editar el quiz indicado.");
    log(socket, "   test <id> - Probar el quiz indicado.");
    log(socket, "   p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket, "   credits - Créditos.");
    log(socket, "   q|quit - Salir del programa.");
    rl.prompt();
};

exports.listCmd = (socket, rl) => {

    models.quiz.findAll()
        .each(quiz => {
                log(socket, ` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};

exports.showCmd = (socket, rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(socket, ` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


exports.addCmd = (socket, rl) => {
    makeQuestion(rl, 'Introduzca un pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta; ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erróneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.deleteCmd = (socket, rl, id) => {

   validateId(id)
       .then(id => models.quiz.destroy({where: {id}}))
       .catch(error => {
           errorlog(socket, error.message);
       })
       .then(() => {
           rl.prompt();
       });
};

exports.editCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, ' Introduzca la pregunta: ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, ' Introduzca la respuesta ')
                        .then(a => {
                            quiz.question = q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erróneo:');
            error.errors.forEach(({message})=> errorlog(message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.testCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            return makeQuestion(rl, `${quiz.question} `)
                .then(answer => {
                    if(answer.toLowerCase().trim() === quiz.answer.toLowerCase()){
                        log(socket, "La respuesta es correcta.");
                        biglog(socket, "CORRECTO", "green");
                    } else {
                        log(socket, "La respuesta es incorrecta.");
                        biglog(socket, "INCORRECTO", "red");
                    }
                });

        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.playCmd = (socket, rl) => {
    let score = 0;
    let toBeResolved = [];
    const playOne = () => {
        new Sequelize.Promise((resolve,  reject) => {
            if (toBeResolved.length === 0) {
                log(socket, " Ya no quedan mas preguntas.");
                log(socket, "Fin del juego. Su resultado es:");
                biglog(socket, score, `yellow`);
                rl.prompt();
            } else {
                let id = Math.round(Math.random() * (toBeResolved.length - 1));
                let id_2= toBeResolved[id];
                toBeResolved.splice(id, 1);
                makeQuestion(rl, `${quiz.question}`)
                    .then(answer => {
                        if (answer.toLowerCase().trim() === quiz.answer.toLowerCase()){
                            score++;
                            log(socket, ` ${colorize('CORRECTO', 'green')}`);
                            log(socket, ` Lleva ${score} aciertos.`);
                            playOne();
                        } else {
                            log(socket, ` ${colorize('INCORRECTO', 'red')}`);
                            log(socket, ` Fin del juego, su resultado es: `);
                            biglog(socket, ` ${score}`, 'yellow');
                            rl.prompt();
                            }
                })
            }
        })
      
    };
    models.quiz.count()
        .then(count => {
            toBeResolved = [count];
        })
        .then(() => models.quiz.findAll())
        .each (quiz => {
            toBeResolved[quiz.id - 1] = quiz;
        })
        .then (() => {
            playOne();
        })
};

exports.creditsCmd = (socket, rl) => {
    log(socket, 'Autor de la práctica:');
    log(socket, 'ALVARO', 'green');
    rl.prompt();
};

exports.quitCmd = (socket, rl) => {
    rl.close();
    socket.end();
};
