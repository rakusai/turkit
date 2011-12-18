
setTrace(2)

function getQuestion(numA, numB) {
    default xml namespace = "http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2005-10-01/QuestionForm.xsd";
    var q = <QuestionForm>
        <Question>
            <QuestionIdentifier>vote</QuestionIdentifier>
            <IsRequired>true</IsRequired>
            <QuestionContent>
                <Text>Which comes first?</Text>
            </QuestionContent>
            <AnswerSpecification>
                <SelectionAnswer>
                    <Selections>
                    </Selections>
                </SelectionAnswer>
            </AnswerSpecification>
        </Question>
    </QuestionForm>

    var options = [{key:"a",value:numA}, {key:"b",value:numB}]
    shuffle(options)
    foreach(options, function (op) {
        default xml namespace = "http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2005-10-01/QuestionForm.xsd";
        q.Question.AnswerSpecification.SelectionAnswer.Selections.Selection +=
            <Selection>
                <SelectionIdentifier>{op.key}</SelectionIdentifier>
                <Text>{op.value}</Text>
            </Selection>
    })
    return "" + q
}

var a = mturk.sort([4, 2, 3, 1], function (a, b) {
    var h = {title : "Compare Two Items", desc : "Compare two items, and decide which comes first.", question : getQuestion(a, b),  reward : 0.01, maxAssignments : 2}
    
    var hit = mturk.createHIT(h)
    if (mturk.vote(hit, function (a) {return a.vote[0]}).bestOption == "a") {
        return -1
    } else {
        return 1
    }
})
print("sorted = " + json(a))
